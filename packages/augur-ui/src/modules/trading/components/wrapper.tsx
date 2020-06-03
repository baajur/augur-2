import React, { Component } from 'react';
import classNames from 'classnames';
import { createBigNumber } from 'utils/create-big-number';

import Form from 'modules/trading/containers/form';
import Confirm from 'modules/trading/components/confirm';
import { generateTrade } from 'modules/trades/helpers/generate-trade';
import { SCALAR, BUY, SELL } from 'modules/common/constants';
import Styles from 'modules/trading/components/wrapper.styles.less';
import { OrderButton, PrimaryButton } from 'modules/common/buttons';
import {
  formatGasCostToEther,
  formatNumber,
  formatMarketShares,
} from 'utils/format-number';
import convertExponentialToDecimal from 'utils/convert-exponential';
import { MarketData, OutcomeFormatted } from 'modules/types';
import { calculateTotalOrderValue } from 'modules/trades/helpers/calc-order-profit-loss-percents';
import { formatDai } from 'utils/format-number';
import { Moment } from 'moment';
import { calcOrderExpirationTime } from 'utils/format-date';
import { orderSubmitted } from 'services/analytics/helpers';
import { placeMarketTrade } from 'modules/trades/actions/place-market-trade';

export interface SelectedOrderProperties {
  orderPrice: string;
  orderQuantity: string;
  selectedNav: string;
  expirationDate?: Moment;
}

interface WrapperProps {
  market: MarketData;
  selectedOutcome: OutcomeFormatted;
  selectedOrderProperties: SelectedOrderProperties;
  addFundsModal: Function;
  disclaimerModal: Function;
  handleFilledOnly: Function;
  loginModal: Function;
  tutorialNext?: Function;
  updateLiquidity?: Function;
  updateSelectedOrderProperties: Function;
  updateSelectedOutcome: Function;
  updateTradeCost: Function;
  updateTradeShares: Function;
  disclaimerSeen: boolean;
  gsnWalletInfoSeen: boolean;
  gasPrice: number;
  hasFunds: boolean;
  hasHistory: boolean;
  isLogged: boolean;
  restoredAccount: boolean;
  initialLiquidity?: boolean;
  tradingTutorial?: boolean;
  currentTimestamp: number;
  availableDai: number;
  gsnUnavailable: boolean;
  initializeGsnWallet: Function;
  endTime: number;
}

interface WrapperState {
  orderPrice: string;
  orderQuantity: string;
  orderDaiEstimate: string;
  orderEscrowdDai: string;
  gasCostEst: string;
  selectedNav: string;
  doNotCreateOrders: boolean;
  expirationDate: Moment;
  trade: any;
  simulateQueue: any[];
}

const OrderTicketHeader = ({ selectedNav, market, updateTradeTotalCost, state}) => {
  const buySelected = selectedNav === BUY;
  return (
    <ul
      className={classNames({
        [Styles.Buy]: buySelected,
        [Styles.Sell]: !buySelected,
        [Styles.Scalar]: market.marketType === SCALAR,
      })}
    >
      <li
        className={classNames({
          [`${Styles.active}`]: buySelected,
        })}
      >
        <button
          onClick={() =>
            updateTradeTotalCost({
              ...state,
              selectedNav: BUY,
            })
          }
        >
          Buy Shares
        </button>
      </li>
      <li
        className={classNames({
          [`${Styles.active}`]: !buySelected,
        })}
      >
        <button
          onClick={() =>
            updateTradeTotalCost({
              ...state,
              selectedNav: SELL,
            })
          }
        >
          Sell Shares
        </button>
      </li>
    </ul>
  );
};

class Wrapper extends Component<WrapperProps, WrapperState> {
  static defaultProps = {
    selectedOutcome: null,
  };

  static getDefaultTrade(props) {
    if (!(props.market || {}).marketType || !(props.selectedOutcome || {}).id) {
      return null;
    }
    const {
      id,
      settlementFee,
      marketType,
      maxPrice,
      minPrice,
      cumulativeScale,
      makerFee,
    } = props.market;
    return generateTrade(
      {
        id,
        settlementFee,
        marketType,
        maxPrice,
        minPrice,
        cumulativeScale,
        makerFee,
      },
      {}
    );
  }

  constructor(props) {
    super(props);

    this.state = {
      orderPrice: props.selectedOrderProperties.orderPrice || '',
      orderQuantity: props.selectedOrderProperties.orderQuantity || '',
      orderDaiEstimate: '',
      orderEscrowdDai: '',
      gasCostEst: '',
      selectedNav: props.selectedOrderProperties.selectedNav || BUY,
      doNotCreateOrders:
        props.selectedOrderProperties.doNotCreateOrders || false,
      expirationDate: props.selectedOrderProperties.expirationDate || null,
      trade: Wrapper.getDefaultTrade(props),
      simulateQueue: [],
    };

    this.clearOrderForm = this.clearOrderForm.bind(this);
    this.updateTradeTotalCost = this.updateTradeTotalCost.bind(this);
    this.updateTradeNumShares = this.updateTradeNumShares.bind(this);
    this.updateOrderProperty = this.updateOrderProperty.bind(this);
    this.updateNewOrderProperties = this.updateNewOrderProperties.bind(this);
    this.clearOrderConfirmation = this.clearOrderConfirmation.bind(this);
    this.queueStimulateTrade = this.queueStimulateTrade.bind(this);
  }

  componentDidMount() {
    const { selectedOrderProperties } = this.props;

    this.updateTradeTotalCost(
      {
        ...selectedOrderProperties,
        orderQuantity: convertExponentialToDecimal(
          selectedOrderProperties.orderQuantity
        ),
      },
      true
    );
  }

  componentDidUpdate(prevProps) {
    const { selectedOrderProperties } = this.props;
    const { orderPrice, orderQuantity, selectedNav } = this.state;
    if (
      JSON.stringify(selectedOrderProperties) !==
      JSON.stringify(prevProps.selectedOrderProperties)
    ) {
      if (
        selectedOrderProperties.orderPrice !== orderPrice ||
        selectedOrderProperties.orderQuantity !== orderQuantity ||
        selectedOrderProperties.selectedNav !== selectedNav
      ) {
        if (selectedOrderProperties.selectedNav !== selectedNav) {
          this.setState({ selectedNav: selectedOrderProperties.selectedNav });
        }
        if (
          !selectedOrderProperties.orderPrice &&
          !selectedOrderProperties.orderQuantity
        ) {
          return this.clearOrderForm();
        }
        // because of invalid outcome on scalars displaying percentage need to clear price before setting it.
        if (this.props.market.marketType === SCALAR) {
          this.setState(
            {
              orderPrice: '',
            },
            () =>
              this.updateTradeTotalCost(
                {
                  ...selectedOrderProperties,
                  orderQuantity: convertExponentialToDecimal(
                    selectedOrderProperties.orderQuantity
                  ),
                },
                true
              )
          );
        } else {
          this.updateTradeTotalCost(
            {
              ...selectedOrderProperties,
              orderQuantity: convertExponentialToDecimal(
                selectedOrderProperties.orderQuantity
              ),
            },
            true
          );
        }
      }
    }
  }

  clearOrderConfirmation() {
    const trade = Wrapper.getDefaultTrade(this.props);
    this.setState({ trade });
  }

  clearOrderForm(wholeForm = true) {
    const trade = Wrapper.getDefaultTrade(this.props);
    const expirationDate =
      this.props.selectedOrderProperties.expirationDate ||
      calcOrderExpirationTime(this.props.endTime, this.props.currentTimestamp);
    const updatedState: any = wholeForm
      ? {
          orderPrice: '',
          orderQuantity: '',
          orderDaiEstimate: '',
          orderEscrowdDai: '',
          gasCostEst: '',
          doNotCreateOrders: false,
          expirationDate,
          trade,
        }
      : { trade };
    this.setState(updatedState, () => this.updateParentOrderValues());
  }

  updateParentOrderValues() {
    const { orderPrice, orderQuantity, selectedNav } = this.state;
    this.props.updateSelectedOrderProperties({
      orderPrice,
      orderQuantity,
      selectedNav,
    });
  }

  updateNewOrderProperties(selectedOrderProperties) {
    this.updateTradeTotalCost({ ...selectedOrderProperties }, true);
  }

  updateOrderProperty(property, callback) {
    this.setState({ ...property }, () => {
      this.updateParentOrderValues();
      if (callback) callback();
    });
  }

  async queueStimulateTrade(order, useValues, selectedNav) {
    const { updateTradeCost, selectedOutcome, market, gasPrice } = this.props;
    this.state.simulateQueue.push(
      new Promise(resolve =>
        updateTradeCost(
          market.id,
          order.selectedOutcomeId
            ? order.selectedOutcomeId
            : selectedOutcome.id,
          {
            limitPrice: order.orderPrice,
            side: order.selectedNav,
            numShares: order.orderQuantity,
            selfTrade: order.selfTrade,
          },
          (err, newOrder) => {
            if (err) {
              // just update properties for form
              return resolve({
                ...useValues,
                orderDaiEstimate: '',
                orderEscrowdDai: '',
                gasCostEst: '',
                selectedNav,
              });
            }
            const newOrderDaiEstimate = formatDai(
              createBigNumber(newOrder.totalOrderValue.fullPrecision),
              {
                roundDown: false,
              }
            ).roundedValue;

            const formattedGasCost = formatGasCostToEther(
              newOrder.gasLimit,
              { decimalsRounded: 4 },
              String(gasPrice)
            ).toString();
            resolve({
              ...useValues,
              orderDaiEstimate: String(newOrderDaiEstimate),
              orderEscrowdDai: newOrder.costInDai.formatted,
              trade: newOrder,
              gasCostEst: formattedGasCost,
              selectedNav,
            });
          }
        )
      )
    );
    await Promise.all(this.state.simulateQueue).then(results =>
      this.setState(results[results.length - 1])
    );
  }
  async updateTradeTotalCost(order, fromOrderBook = false) {
    const {
      selectedOutcome,
      market,
      initialLiquidity,
      tradingTutorial,
    } = this.props;
    const selectedNav = order.selectedNav
      ? order.selectedNav
      : this.state.selectedNav;
    let useValues = {
      ...order,
      orderDaiEstimate: '',
    };
    if (!fromOrderBook) {
      useValues = {
        orderDaiEstimate: '',
      };
    }
    if (initialLiquidity || tradingTutorial) {
      const totalCost = calculateTotalOrderValue(
        order.orderQuantity,
        order.orderPrice,
        order.selectedNav,
        createBigNumber(market.minPrice),
        createBigNumber(market.maxPrice),
        market.marketType
      );
      const formattedValue = formatDai(totalCost);
      let trade = {
        ...useValues,
        limitPrice: order.orderPrice,
        selectedOutcome: selectedOutcome.id,
        totalCost: formatNumber(totalCost),
        numShares: order.orderQuantity,
        shareCost: formatNumber(0),
        potentialDaiLoss: formatNumber(40),
        potentialDaiProfit: formatNumber(60),
        side: order.selectedNav,
        selectedNav,
      };

      this.setState({
        ...useValues,
        orderDaiEstimate: totalCost ? formattedValue.roundedValue : '',
        orderEscrowdDai: totalCost
          ? formattedValue.roundedValue.toString()
          : '',
        gasCostEst: '',
        trade: trade,
        selectedNav,
      });
    } else {
      this.setState({
        selectedNav,
      });
      if (order.orderPrice) {
        await this.queueStimulateTrade(order, useValues, selectedNav);
      } else {
        this.setState({
          orderQuantity: order.orderQuantity,
        });
      }
    }
  }

  handlePlaceMarketTrade(market, selectedOutcome, s) {
    orderSubmitted(s.selectedNav, market.id);
    let trade = s.trade;
    if (this.state.expirationDate) {
      trade = {
        ...trade,
        expirationTime: this.state.expirationDate,
      };
    }
    placeMarketTrade({
      marketId: market.id,
      outcomeId: selectedOutcome.id,
      tradeInProgress: trade,
      doNotCreateOrders: s.doNotCreateOrders,
    });
    this.clearOrderForm();
  }

  updateTradeNumShares(order) {
    const { updateTradeShares, selectedOutcome, market, gasPrice } = this.props;
    updateTradeShares(
      market.id,
      selectedOutcome.id,
      {
        limitPrice: order.orderPrice,
        side: order.selectedNav,
        maxCost: order.orderDaiEstimate,
      },
      (err, newOrder) => {
        if (err) return console.error(err); // what to do with error here

        const numShares = formatMarketShares(
          market.marketType,
          createBigNumber(newOrder.numShares),
          {
            roundDown: false,
          }
        ).rounded;

        const formattedGasCost = formatGasCostToEther(
          newOrder.gasLimit,
          { decimalsRounded: 4 },
          String(gasPrice)
        ).toString();

        this.setState(
          {
            orderQuantity: String(numShares),
            orderEscrowdDai: newOrder.costInDai.formatted,
            orderDaiEstimate: order.orderDaiEstimate,
            trade: newOrder,
            gasCostEst: formattedGasCost,
          },
          () => this.updateParentOrderValues()
        );
      }
    );
  }

  render() {
    const {
      market,
      selectedOutcome,
      updateSelectedOutcome,
      disclaimerSeen,
      disclaimerModal,
      updateLiquidity,
      initialLiquidity,
      tradingTutorial,
      tutorialNext,
      hasFunds,
      isLogged,
      restoredAccount,
      loginModal,
      addFundsModal,
      hasHistory,
      availableDai,
      gsnUnavailable,
      initializeGsnWallet,
      gsnWalletInfoSeen,
    } = this.props;
    let { minPriceBigNumber, maxPriceBigNumber, minPrice, maxPrice } = market;
    if (!minPriceBigNumber) {
      minPriceBigNumber = createBigNumber(minPrice);
    }
    if (!maxPriceBigNumber) {
      maxPriceBigNumber = createBigNumber(maxPrice);
    }
    const {
      selectedNav,
      orderPrice,
      orderQuantity,
      orderDaiEstimate,
      trade,
    } = this.state;
    const insufficientFunds =
      trade &&
      trade.costInDai &&
      createBigNumber(trade.costInDai.value).gte(createBigNumber(availableDai));

    const isOpenOrder = trade && trade.numFills === 0;

    let actionButton: any = (
      <OrderButton
        type={selectedNav}
        initialLiquidity={initialLiquidity}
        action={e => {
          e.preventDefault();
          if (initialLiquidity) {
            updateLiquidity(selectedOutcome, this.state);
            this.clearOrderForm();
          } else if (tradingTutorial) {
            tutorialNext();
            this.clearOrderForm();
          } else {
            if (disclaimerSeen) {
              gsnUnavailable && !gsnWalletInfoSeen
                ? initializeGsnWallet(() =>
                    this.handlePlaceMarketTrade(
                      market,
                      selectedOutcome,
                      this.state
                    )
                  )
                : this.handlePlaceMarketTrade(
                    market,
                    selectedOutcome,
                    this.state
                  );
            } else {
              disclaimerModal({
                onApprove: () =>
                  gsnUnavailable && !gsnWalletInfoSeen
                    ? initializeGsnWallet(() =>
                        this.handlePlaceMarketTrade(
                          market,
                          selectedOutcome,
                          this.state
                        )
                      )
                    : this.handlePlaceMarketTrade(
                        market,
                        selectedOutcome,
                        this.state
                      ),
              });
            }
          }
        }}
        disabled={
          !trade ||
          !trade.limitPrice ||
          (gsnUnavailable && isOpenOrder) ||
          insufficientFunds
        }
      />
    );
    switch (true) {
      case !restoredAccount && !isLogged && !tradingTutorial:
        actionButton = (
          <PrimaryButton
            id="login-button"
            action={() => loginModal()}
            text="Login to Place Order"
          />
        );
        break;
      case isLogged && !hasFunds && !tradingTutorial:
        actionButton = (
          <PrimaryButton
            id="add-funds"
            action={() => addFundsModal()}
            text="Add Funds to Place Order"
          />
        );
        break;
      default:
        break;
    }
    const orderEmpty =
      orderPrice === '' && orderQuantity === '' && orderDaiEstimate === '';
    const showTip = !hasHistory && orderEmpty;
    const showConfirm =
      !!trade &&
      ((trade.potentialDaiLoss && trade.potentialDaiLoss.value !== 0) ||
        (trade.orderShareProfit && trade.orderShareProfit.value !== 0) ||
        (trade.sharesFilled && trade.sharesFilled.value !== 0));
    return (
      <section className={Styles.Wrapper}>
        <div>
          <OrderTicketHeader
            market={market}
            selectedNav={selectedNav}
            updateTradeTotalCost={this.updateTradeTotalCost}
            state={this.state}
          />
          <Form
            market={market}
            tradingTutorial={tradingTutorial}
            initialLiquidity={initialLiquidity}
            selectedOutcome={selectedOutcome}
            updateSelectedOutcome={updateSelectedOutcome}
            orderState={this.state}
            updateState={updates =>
              this.setState({ ...this.state, ...updates })
            }
            updateOrderProperty={this.updateOrderProperty}
            clearOrderForm={this.clearOrderForm}
            updateTradeTotalCost={this.updateTradeTotalCost}
            updateTradeNumShares={this.updateTradeNumShares}
            clearOrderConfirmation={this.clearOrderConfirmation}
          />
        </div>
        {showConfirm && (
          <Confirm
            selectedOutcome={selectedOutcome}
            market={market}
            trade={trade}
            initialLiquidity={initialLiquidity}
            tradingTutorial={tradingTutorial}
          />
        )}
        <div>{actionButton}</div>
        {showTip && !initialLiquidity && (
          <div>
            <span>TIP:</span> If you think an outcome won't occur, you can sell
            shares that you don't own.
          </div>
        )}
      </section>
    );
  }
}

export default Wrapper;
