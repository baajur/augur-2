import { connect } from 'react-redux';
import { withRouter } from 'react-router-dom';
import { AppState } from 'store';
import { COLUMN_TYPES, INVALID_OUTCOME_ID } from 'modules/common/constants';
import { selectMarketOutcomeBestBidAsk, selectBestBidAlert } from 'modules/markets/selectors/select-market-outcome-best-bid-ask';
import Row from 'modules/common/row';

const mapStateToProps = (state: AppState, ownProps) => {
  const { marketInfos } = state;
  const market = marketInfos[ownProps.marketId];
  const { minPrice, maxPrice, tickSize } = market;
  return {
    orderBook: state.orderBooks ? state.orderBooks[ownProps.marketId] : null,
    minPrice,
    maxPrice,
    tickSize
  };
};

const mapDispatchToProps = () => ({});

const mergeProps = (sP: any, dP: any, oP: any) => {
  const outcome = oP.outcome;
  const outcomeName = outcome.description;
  const orderBook = sP.orderBook && sP.orderBook[outcome.id];
  const { topAsk, topBid } = selectMarketOutcomeBestBidAsk(orderBook, sP.tickSize);
  const bestBidAlert = selectBestBidAlert(outcome.id, topBid.price.value, sP.minPrice, sP.maxPrice)
  const topBidShares = topBid.shares;
  const topAskShares = topAsk.shares;

  const topBidPrice = topBid.price;
  const topAskPrice = topAsk.price;

  const lastPrice = outcome.lastPrice;

  const columnProperties = [
    {
      key: "outcomeName",
      columnType: outcome.id === INVALID_OUTCOME_ID ? COLUMN_TYPES.INVALID_LABEL : COLUMN_TYPES.TEXT,
      text: outcomeName,
      keyId: outcomeName,
      showExtraNumber: !oP.scalarDenomination,
    },
    {
      key: "topBidShares",
      columnType: COLUMN_TYPES.VALUE,
      value: topBidShares,
      showEmptyDash: true,
    },
    {
      key: "topBidPrice",
      columnType: COLUMN_TYPES.VALUE,
      value: topBidPrice,
      useFull: true,
      showEmptyDash: true,
      alert: bestBidAlert,

    },
    {
      key: "topAskPrice",
      columnType: COLUMN_TYPES.VALUE,
      value: topAskPrice,
      useFull: true,
      showEmptyDash: true,
    },
    {
      key: "topAskShares",
      columnType: COLUMN_TYPES.VALUE,
      value: topAskShares,
      showEmptyDash: true,
    },
    {
      key: "lastPrice",
      columnType: COLUMN_TYPES.VALUE,
      value: lastPrice,
      useFull: true,
      addIndicator: true,
      outcome,
      location: "tradingPage",
    },
  ];
  return {
    ...oP,
    ...sP,
    ...dP,
    rowProperties: outcome,
    columnProperties,
    rowOnClick: (e: Event) => {oP.updateSelectedOutcome(outcome.id);},
    styleOptions: {
      outcome: true,
      isSingle: true,
      noToggle: true,
      colorId: outcome.id + 1,
      active: oP.selectedOutcomeId === outcome.id,
      isInvalid: outcome.id === INVALID_OUTCOME_ID
    }
  };
};

export default withRouter(
  connect(
    mapStateToProps,
    mapDispatchToProps,
    mergeProps
  )(Row)
);
