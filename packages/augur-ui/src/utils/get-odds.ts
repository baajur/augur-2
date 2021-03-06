import {
  ODDS_TYPE,
  BID,
  NEGATIVE_ONE,
  ONE,
  FIFTY,
  HUNDRED,
} from 'modules/common/constants';
import { createBigNumber, BigNumber } from 'utils/create-big-number';

const { DECIMAL, FRACTIONAL, AMERICAN, PERCENT } = ODDS_TYPE;

const mockExamples = [
  {
    price: 0.35,
    min: 0,
    max: 1,
    type: BID,
  },
  {
    price: 0.35,
    min: 0,
    max: 1,
    type: 'ask',
  },
  {
    price: 350,
    min: 0,
    max: 1000,
    type: BID,
  },
  {
    price: 10,
    min: -10,
    max: 50,
    type: 'ask',
  },
  {
    price: 10,
    min: -10,
    max: 50,
    type: BID,
  },
];

export const test = (examples = mockExamples) => {
  examples.forEach(example => console.log(convertToOdds({ ...example })));
};

interface ConvertToOddsType {
  price: number | string | BigNumber;
  min?: number | string | BigNumber;
  max?: number | string | BigNumber;
  type?: string;
  toDecimals?: number;
}

export const convertToOdds = ({
  price,
  min = 0,
  max = 1,
  type = BID,
  toDecimals = 4,
}: ConvertToOddsType) => {
  const bnPrice = createBigNumber(price);
  const bnMin = createBigNumber(min);
  const bnMax = createBigNumber(max);
  let normalizedPrice = bnPrice.minus(bnMin).dividedBy(bnMax.minus(bnMin));
  normalizedPrice =
    type === BID ? normalizedPrice : createBigNumber(1).minus(normalizedPrice);

  return getOddsObject(normalizedPrice, toDecimals);
};

export const getNewToWin = (odds, wager, toDecimals = 2) => {
  const fractional = convertAmericanToFractional(odds);
  const bnWager = createBigNumber(wager);
  return bnWager.times(fractional).toFixed(toDecimals);
};

const getOddsObject = (normalizedValue: BigNumber, toDecimals = 4) => {
  const percentage: BigNumber = convertToPercentage(normalizedValue);
  const decimal: BigNumber = convertToDecimal(percentage);
  const fractional: string = convertToFractional(decimal, toDecimals);
  const american: BigNumber = convertToAmerican(percentage);

  return {
    [DECIMAL]: Number(decimal.toFixed(toDecimals, 4)),
    [FRACTIONAL]: fractional,
    [AMERICAN]: Number(american.toFixed(0)),
    [PERCENT]: Number(percentage.toFixed(2, 4)),
  };
};

const convertToPercentage = (normalizedValue: BigNumber) =>
  normalizedValue.times(HUNDRED);

const convertToDecimal = (percentage: BigNumber) =>
  ONE.dividedBy(percentage.dividedBy(HUNDRED));

const convertToFractional = (decimal: BigNumber, toDecimals = 4) =>
  `${Number(decimal.minus(ONE).toFixed(toDecimals, 4))}/1`;

const convertToPositiveAmerican = (percentage: BigNumber) =>
  HUNDRED.dividedBy(percentage.dividedBy(HUNDRED)).minus(HUNDRED);

const convertToNegativeAmerican = (percentage: BigNumber) =>
  percentage
    .dividedBy(ONE.minus(percentage.dividedBy(HUNDRED)))
    .times(NEGATIVE_ONE);

const convertToAmerican = (percentage: BigNumber) =>
  percentage.gte(FIFTY)
    ? convertToPositiveAmerican(percentage)
    : convertToNegativeAmerican(percentage);

const convertAmericanToFractional = (americanOdds) => {
  const bnAmerican = createBigNumber(americanOdds);
  return bnAmerican.isNegative() ? (HUNDRED.times(-1)).dividedBy(bnAmerican) : bnAmerican.dividedBy(HUNDRED);
};

// Percentage = normalized price times 100, e.g. a normalized price of .85 = .85 * 100 = 85.

// Decimal - 1 divided by (the percentage divided by 100) e.g. a probability of 50% = 1 / (50 / 100) = 2.

// Fraction - (1 divided by (the percentage divided by 100)) minus 1 e.g. a probability of 25% = (1 / (25 / 100)) - 1 = 3 = 3/1.

// American:
// Positive odds - (100 divided by (the percentage divided by 100)) minus 100 e.g. a probability of 10% = (100 / (10 / 100)) - 100 = 900.

// Negative odds - The probability divided by (1 minus (the probability divided by 100)) then multiply by -1 to convert into a negative e.g. a probability of 20% = (20 / (1 - (20/100))) * -1 = -25.

