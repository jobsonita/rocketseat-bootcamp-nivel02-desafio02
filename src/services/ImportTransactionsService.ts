import csvParse from 'csv-parse';
import fs from 'fs';
import { getCustomRepository, getRepository } from 'typeorm';

import AppError from '../errors/AppError';

import Category from '../models/Category';
import Transaction from '../models/Transaction';

import TransactionsRepository from '../repositories/TransactionsRepository';

interface Request {
  filepath: string;
}

interface CSVLine {
  title: string;
  type: 'income' | 'outcome';
  value: number;
  category: string;
}

class ImportTransactionsService {
  async execute({ filepath }: Request): Promise<Transaction[]> {
    const readCSVStream = fs.createReadStream(filepath);

    const parseStream = csvParse({ from_line: 2, ltrim: true, rtrim: true });

    const parseCSV = readCSVStream.pipe(parseStream);

    const lines = [] as CSVLine[];
    parseCSV.on('data', ([title, type, value, category]) =>
      lines.push({
        title,
        type,
        value: Number(value),
        category,
      }),
    );
    await new Promise(resolve => parseCSV.on('end', resolve));

    const transactionsRepository = getCustomRepository(TransactionsRepository);

    let { total } = await transactionsRepository.getBalance();
    lines.forEach(line => {
      switch (line.type) {
        case 'income':
          total += line.value;
          break;
        case 'outcome':
          total -= line.value;
          break;
        default:
          throw new AppError('Invalid transaction type');
      }
      if (total < 0) {
        throw new AppError('Inconsistent transactions detected');
      }
    });

    const categoriesRepository = getRepository(Category);
    let categories = await categoriesRepository.find();

    const category_titles = categories.map(category => category.title);

    const new_category_titles = [] as string[];
    lines.forEach(line => {
      if (
        !category_titles.includes(line.category) &&
        !new_category_titles.includes(line.category)
      ) {
        new_category_titles.push(line.category);
      }
    });

    const new_categories_data = new_category_titles.map(title => ({ title }));

    const new_categories = categoriesRepository.create(new_categories_data);
    await categoriesRepository.save(new_categories);

    categories = categories.concat(new_categories);

    const new_transactions_data = lines.map(line => {
      const category = categories.find(cat => cat.title === line.category);
      if (!category) {
        throw new AppError(`Invalid category for line ${line}`);
      }

      return {
        title: line.title,
        type: line.type,
        value: line.value,
        category_id: category.id,
      };
    });

    const new_transactions = transactionsRepository.create(
      new_transactions_data,
    );
    await transactionsRepository.save(new_transactions);

    await fs.promises.unlink(filepath);

    return new_transactions;
  }
}

export default ImportTransactionsService;
