import { getCustomRepository } from 'typeorm';

import AppError from '../errors/AppError';

import TransactionRepository from '../repositories/TransactionsRepository';

interface Request {
  id: string;
}

class DeleteTransactionService {
  public async execute({ id }: Request): Promise<void> {
    const transactionsRepository = getCustomRepository(TransactionRepository);

    const transaction = await transactionsRepository.find({ id });

    if (!transaction) {
      throw new AppError('Transaction not found.');
    }

    await transactionsRepository.remove(transaction);
  }
}

export default DeleteTransactionService;
