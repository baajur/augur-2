import {
  BaseAction,
  CreateMarketData,
  PendingOrdersType,
  PendingQueue,
} from 'modules/types';
import { TransactionMetadata } from 'contract-dependencies-ethers/build';
import {
  isTransactionConfirmed,
  transactionConfirmations,
  doReportDisputeAddStake,
} from 'modules/contracts/actions/contractCalls';
import { TXEventName } from '@augurproject/sdk';
import { ThunkDispatch } from 'redux-thunk';
import { Action } from 'redux';
import {
  TRANSACTIONS,
  CANCELORDER,
  TX_CHECK_BLOCKNUMBER_LIMIT,
  SUBMIT_REPORT,
  SUBMIT_DISPUTE,
} from 'modules/common/constants';
import { AppState } from 'appStore';
import { updatePendingOrderStatus } from 'modules/orders/actions/pending-orders-management';
import { AppStatus } from 'modules/app/store/app-status';

import { generateTxParameterIdFromString } from 'utils/generate-tx-parameter-id';
import { calculatePayoutNumeratorsArray } from '@augurproject/sdk';
import { PendingOrders } from 'modules/app/store/pending-orders';
export const ADD_PENDING_DATA = 'ADD_PENDING_DATA';
export const REMOVE_PENDING_DATA = 'REMOVE_PENDING_DATA';
export const REMOVE_PENDING_DATA_BY_HASH = 'REMOVE_PENDING_DATA_BY_HASH';
export const UPDATE_PENDING_DATA_BY_HASH = 'UPDATE_PENDING_DATA_BY_HASH';

export const loadPendingQueue = (pendingQueue: any) => (
  dispatch: ThunkDispatch<void, any, Action>
) => {
  if (!pendingQueue) return;
  Object.keys(pendingQueue).map(async queue => {
    const data = pendingQueue[queue];
    if (!data) return;
    Object.keys(data).map(async (d: any) => {
      const pendingData = data[d];
      if (!pendingData.pendingId || !pendingData.hash) return;
      if (pendingData.status === TXEventName.Failure)
        addPendingData(
          d,
          queue,
          pendingData.status,
          pendingData.hash,
          pendingData.data
        );
      const confirmed = await isTransactionConfirmed(pendingData.hash);
      confirmed
        ? dispatch(removePendingData(d, queue))
        : addPendingData(
            d,
            queue,
            pendingData.status,
            pendingData.hash,
            pendingData.data
          );
    });
  });
};

export const addUpdatePendingTransaction = (
  methodCall: string,
  status: string,
  hash: string = null,
  info?: TransactionMetadata
): void =>
  addPendingDataWithBlockNumber(methodCall, TRANSACTIONS, status, hash, info);

export const removePendingTransaction = (methodCall: string) =>
  removePendingData(methodCall, TRANSACTIONS);

export const addPendingData = (
  pendingId: string,
  queueName: string,
  status: string,
  hash: string,
  info?: CreateMarketData | object
): void =>
  addPendingDataWithBlockNumber(pendingId, queueName, status, hash, info);

const addPendingDataWithBlockNumber = (
  pendingId: string,
  queueName: string,
  status: string,
  hash: string,
  info?: CreateMarketData | TransactionMetadata
): void => {
  const {
    blockchain: { currentBlockNumber: blockNumber },
  } = AppStatus.get();
  AppStatus.actions.addPendingData({
    pendingId,
    queueName,
    status,
    hash,
    info,
    blockNumber,
  });
};

const updatePendingDataHash = (
  queueName: string,
  oldHash: string,
  newHash: string,
  status: string
): BaseAction => (
  dispatch: ThunkDispatch<void, any, Action>,
  getState: () => AppState
) => {
  const {
    blockchain: { currentBlockNumber: blockNumber },
  } = AppStatus.get();
  AppStatus.actions.addPendingDataByHash({
    queueName,
    oldHash,
    newHash,
    blockNumber,
    status,
  });
};

export const removePendingData = (pendingId: string, queueName: string) => {
  AppStatus.actions.removePendingData({
    pendingId,
    queueName,
    hash: undefined,
  });
};

export const removePendingDataByHash = (hash: string, queueName: string) => {
  AppStatus.actions.removePendingData({
    pendingId: undefined,
    hash,
    queueName,
  });
};

export const addCanceledOrder = (
  orderId: string,
  status: string,
  hash: string
) => (dispatch: ThunkDispatch<void, any, Action>) => {
  addPendingData(orderId, CANCELORDER, status, hash);
};

export const removeCanceledOrder = (orderId: string) => (
  dispatch: ThunkDispatch<void, any, Action>
) => dispatch(removePendingData(orderId, CANCELORDER));

export const addPendingReport = (
  report: doReportDisputeAddStake,
  payload = {}
) => (dispatch: ThunkDispatch<void, any, Action>) => {
  dispatch(addPendingReportDispute(report, SUBMIT_REPORT, payload));
};

export const addPendingDispute = (
  report: doReportDisputeAddStake,
  payload = {}
) => (dispatch: ThunkDispatch<void, any, Action>) => {
  dispatch(addPendingReportDispute(report, SUBMIT_DISPUTE, payload));
};

const addPendingReportDispute = (
  report: doReportDisputeAddStake,
  type: string = SUBMIT_REPORT,
  payload = {},
  status: string = TXEventName.Pending
) => (dispatch: ThunkDispatch<void, any, Action>) => {
  const payoutnumerators = calculatePayoutNumeratorsArray(
    report.maxPrice,
    report.minPrice,
    report.numTicks,
    report.numOutcomes,
    report.marketType,
    report.outcomeId,
    report.isInvalid
  ).map(x => String(x));
  const amount = report.attoRepAmount || '0';
  const tempHash = generateTxParameterIdFromString(
    `${String(payoutnumerators)}${type}${String(amount)}`
  );
  addPendingData(report.marketId, type, status, tempHash, payload);
};

export const updatePendingReportHash = (transaction, hash, status) => (
  dispatch: ThunkDispatch<void, any, Action>
) => {
  dispatch(
    updatePendingReportDisputehash(transaction, SUBMIT_REPORT, hash, status)
  );
};

export const updatePendingDisputeHash = (transaction, hash, status) => (
  dispatch: ThunkDispatch<void, any, Action>
) => {
  dispatch(
    updatePendingReportDisputehash(transaction, SUBMIT_DISPUTE, hash, status)
  );
};

const updatePendingReportDisputehash = (
  transaction,
  queueName,
  newHash,
  status
) => (dispatch: ThunkDispatch<void, any, Action>) => {
  const payoutnumerators = transaction._payoutNumerators.map(x => String(x));
  const amount = transaction._additionalStake || transaction._amount;
  const tempHash = generateTxParameterIdFromString(
    `${String(payoutnumerators)}${queueName}${String(amount)}`
  );
  dispatch(updatePendingDataHash(queueName, tempHash, newHash, status));
};

interface PendingItem {
  queueName: string;
  pendingId: string;
  status: string;
  blockNumber: number;
  hash: string;
  parameters?: any;
  data?: CreateMarketData;
}

export const findAndSetTransactionsTimeouts = (blockNumber: number) => (
  dispatch: ThunkDispatch<void, any, Action>,
  getState: () => AppState
) => {
  const { pendingQueue } = AppStatus.get();
  const { pendingOrders } = PendingOrders.get();
  const thresholdBlockNumber = blockNumber - TX_CHECK_BLOCKNUMBER_LIMIT;

  dispatch(processingPendingQueue(thresholdBlockNumber, pendingQueue));
  dispatch(processingPendingOrders(thresholdBlockNumber, pendingOrders));
};

const processingPendingQueue = (
  thresholdBlockNumber: number,
  pendingQueue: PendingQueue
) => (dispatch: ThunkDispatch<void, any, Action>) => {
  Object.keys(pendingQueue)
    .reduce(
      (p, queueName) =>
        p.concat(
          Object.keys(pendingQueue[queueName])
            .map(pendingId => ({
              queueName,
              pendingId,
              ...pendingQueue[queueName][pendingId],
            }))
            .filter(
              pendingItem =>
                (pendingItem.status === TXEventName.AwaitingSigning ||
                  pendingItem.status === TXEventName.Pending) &&
                pendingItem.blockNumber &&
                thresholdBlockNumber >= pendingItem.blockNumber
            )
        ),
      [] as PendingItem[]
    )
    .forEach(async queueItem => {
      console.log(queueItem.blockNumber, 'threshold', thresholdBlockNumber);
      const confirmations = queueItem.hash
        ? await transactionConfirmations(queueItem.hash)
        : undefined;
      if (confirmations === undefined) {
        addPendingData(
          queueItem.pendingId,
          queueItem.queueName,
          TXEventName.Failure,
          queueItem.hash,
          queueItem.data
        );
      } else if (confirmations > 0) {
        addPendingData(
          queueItem.pendingId,
          queueItem.queueName,
          TXEventName.Success,
          queueItem.hash,
          queueItem.data
        );
      }
    });
};

const processingPendingOrders = (
  thresholdBlockNumber: number,
  pendingOrders: PendingOrdersType
) => (dispatch: ThunkDispatch<void, any, Action>) => {
  Object.keys(pendingOrders).map(marketId => {
    pendingOrders[marketId]
      .filter(
        order =>
          order.blockNumber <= thresholdBlockNumber &&
          (order.status === TXEventName.Pending ||
            order.status === TXEventName.AwaitingSigning)
      )
      .map(order =>
        dispatch(
          updatePendingOrderStatus(
            order.id,
            marketId,
            TXEventName.Failure,
            order.hash
          )
        )
      );
  });
};
