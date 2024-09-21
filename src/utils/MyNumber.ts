import BigNumber from 'bignumber.js';
import { uint256 } from 'starknet';
import Decimal from 'decimal.js';

const customInspectSymbol = Symbol.for('nodejs.util.inspect.custom');

export default class MyNumber {
  bigNumber: BigNumber;
  decimals: number;

  constructor(bigNumber: string, decimals: number) {
    this.bigNumber = new BigNumber(bigNumber);
    this.decimals = decimals;
  }

  static fromEther(num: string, decimals: number) {
    try {
      return new MyNumber(
        new Decimal(num).mul(10 ** decimals).toFixed(),
        decimals,
      );
    } catch (e) {
      console.error('fromEther', e, num, decimals);
      throw e;
    }
  }

  static fromZero() {
    return new MyNumber('0', 0);
  }

  toString() {
    return this.bigNumber.toFixed(0);
  }

  toEtherStr() {
    return new Decimal(this.bigNumber.toFixed(0))
      .div(10 ** this.decimals)
      .toFixed(this.decimals);
  }

  toFixedStr(decimals: number) {
    return Number(this.toEtherStr()).toFixed(decimals);
  }

  toEtherToFixedDecimals(decimals: number) {
    // rounding down
    return (
      Math.floor(parseFloat(this.toEtherStr()) * 10 ** decimals) /
      10 ** decimals
    ).toFixed(decimals);
  }

  isZero() {
    return this.bigNumber.eq('0');
  }

  /**
   *
   * @param amountEther in token terms without decimal e.g. 1 for 1 STRK
   * @param command BigNumber compare funds. e.g. gte, gt, lt
   * @returns
   * @dev Add more commands as needed
   */
  compare(value: MyNumber, command: 'gte' | 'gt' | 'lt') {
    return this.bigNumber[command](value.bigNumber);
  }

  operate(command: 'div' | 'plus' | 'mul', value: string | number) {
    const bn = new BigNumber(Number(value).toFixed(6));
    return new MyNumber(this.bigNumber[command](bn).toFixed(0), this.decimals);
  }

  subtract(value: MyNumber) {
    const bn = this.bigNumber.minus(value.bigNumber);
    return new MyNumber(bn.toString(), this.decimals);
  }

  toUint256() {
    return uint256.bnToUint256(this.bigNumber.toFixed(0));
  }

  static min(a: MyNumber, b: MyNumber) {
    if (a.decimals !== b.decimals) {
      const diff = Math.abs(a.decimals - b.decimals);
      if (a.decimals > b.decimals) {
        b = new MyNumber(b.bigNumber.times(10 ** diff).toString(), a.decimals);
      } else {
        a = new MyNumber(a.bigNumber.times(10 ** diff).toString(), b.decimals);
      }
    }
    const bn = BigNumber.min(a.bigNumber, b.bigNumber);
    return new MyNumber(
      bn.toString(),
      a.decimals > b.decimals ? a.decimals : b.decimals,
    );
  }

  static max(a: MyNumber, b: MyNumber) {
    if (a.decimals !== b.decimals) {
      const diff = Math.abs(a.decimals - b.decimals);
      if (a.decimals > b.decimals) {
        b = new MyNumber(b.bigNumber.times(10 ** diff).toString(), a.decimals);
      } else {
        a = new MyNumber(a.bigNumber.times(10 ** diff).toString(), b.decimals);
      }
    }
    const bn = BigNumber.max(a.bigNumber, b.bigNumber);
    return new MyNumber(
      bn.toString(),
      a.decimals > b.decimals ? a.decimals : b.decimals,
    );
  }

  [customInspectSymbol](depth: any, inspectOptions: any, inspect: any) {
    return JSON.stringify({ raw: this.toString(), decimals: this.decimals });
  }
}
