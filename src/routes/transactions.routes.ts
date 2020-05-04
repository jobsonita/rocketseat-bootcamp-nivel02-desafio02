/* eslint-disable no-restricted-syntax, no-await-in-loop */

import { Router } from 'express';
import multer from 'multer';
import { getCustomRepository } from 'typeorm';

import uploadConfig from '../config/upload';

import Transaction from '../models/Transaction';
import TransactionsRepository from '../repositories/TransactionsRepository';
import CreateTransactionService from '../services/CreateTransactionService';
import DeleteTransactionService from '../services/DeleteTransactionService';
import ImportTransactionsService from '../services/ImportTransactionsService';

const upload = multer(uploadConfig);

const transactionsRouter = Router();

transactionsRouter.get('/', async (request, response) => {
  const transactionsRepository = getCustomRepository(TransactionsRepository);

  const transactions = await transactionsRepository.find();
  const balance = await transactionsRepository.getBalance();

  return response.json({ transactions, balance });
});

transactionsRouter.post('/', async (request, response) => {
  const { title, type, value, category } = request.body;

  const createTransaction = new CreateTransactionService();

  const transaction = await createTransaction.execute({
    title,
    type,
    value,
    category_title: category,
  });

  return response.json(transaction);
});

transactionsRouter.delete('/:id', async (request, response) => {
  const { id } = request.params;

  const deleteTransaction = new DeleteTransactionService();

  await deleteTransaction.execute({ id });

  return response.json({ ok: true });
});

transactionsRouter.post(
  '/import',
  upload.array('files'),
  async (request, response) => {
    const importTransactions = new ImportTransactionsService();

    const files = request.files as Express.Multer.File[];

    console.log(files);

    let transactions: Transaction[] = [];

    for (const file of files) {
      const importedTransactions = await importTransactions.execute({
        filepath: file.path,
      });

      transactions = [...transactions, ...importedTransactions];
    }

    response.json(transactions);
  },
);

export default transactionsRouter;
