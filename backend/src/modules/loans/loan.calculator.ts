import { addWeeks, addMonths, addDays } from '../../utils/helpers';
import type { ScheduleItem } from '../../types';

interface CalculationInput {
  principal: number;
  annualRate: number;          // e.g. 24 for 24%
  durationValue: number;       // e.g. 12
  durationUnit: 'DAYS' | 'WEEKS' | 'MONTHS';
  interestMethod: 'FLAT' | 'REDUCING_BALANCE';
  repaymentFrequency: 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';
  startDate: Date;
}

export interface CalculationResult {
  principal: number;
  totalInterest: number;
  totalDue: number;
  installmentAmount: number;
  numberOfInstallments: number;
  schedule: ScheduleItem[];
}

/**
 * Calculate loan schedule using Flat or Reducing Balance method
 */
export function calculateLoan(input: CalculationInput): CalculationResult {
  const { principal, annualRate, durationValue, durationUnit, interestMethod, repaymentFrequency, startDate } = input;

  const numberOfInstallments = getNumberOfInstallments(durationValue, durationUnit, repaymentFrequency);

  if (interestMethod === 'FLAT') {
    return calculateFlat(principal, annualRate, numberOfInstallments, repaymentFrequency, startDate, durationValue, durationUnit);
  } else {
    return calculateReducingBalance(principal, annualRate, numberOfInstallments, repaymentFrequency, startDate);
  }
}

/**
 * Flat rate: interest = principal × rate × duration
 */
function calculateFlat(
  principal: number,
  annualRate: number,
  installments: number,
  frequency: string,
  startDate: Date,
  durationValue: number,
  durationUnit: string
): CalculationResult {
  // Convert annual rate to total interest for the loan period
  const periodInYears = getPeriodInYears(durationValue, durationUnit);
  const totalInterest = roundTo2(principal * (annualRate / 100) * periodInYears);
  const totalDue = roundTo2(principal + totalInterest);
  const installmentAmount = roundTo2(totalDue / installments);
  const principalPerInstallment = roundTo2(principal / installments);
  const interestPerInstallment = roundTo2(totalInterest / installments);

  const schedule: ScheduleItem[] = [];
  let balanceRemaining = principal;
  let currentDate = new Date(startDate);

  for (let i = 1; i <= installments; i++) {
    currentDate = getNextPaymentDate(currentDate, frequency);

    const isLast = i === installments;
    // Handle rounding on last installment
    const principalComponent = isLast ? balanceRemaining : principalPerInstallment;
    const interestComponent = isLast
      ? roundTo2(totalInterest - interestPerInstallment * (installments - 1))
      : interestPerInstallment;

    balanceRemaining = roundTo2(balanceRemaining - principalComponent);

    schedule.push({
      installmentNumber: i,
      dueDate: new Date(currentDate),
      principalAmount: principalComponent,
      interestAmount: interestComponent,
      totalAmount: roundTo2(principalComponent + interestComponent),
      balanceAfter: Math.max(0, balanceRemaining),
    });
  }

  return {
    principal,
    totalInterest,
    totalDue,
    installmentAmount,
    numberOfInstallments: installments,
    schedule,
  };
}

/**
 * Reducing balance: interest calculated on remaining principal each period
 */
function calculateReducingBalance(
  principal: number,
  annualRate: number,
  installments: number,
  frequency: string,
  startDate: Date
): CalculationResult {
  const periodicRate = getPeriodicRate(annualRate, frequency);

  // EMI formula: EMI = P × r × (1+r)^n / ((1+r)^n - 1)
  const rateN = Math.pow(1 + periodicRate, installments);
  const emi = roundTo2((principal * periodicRate * rateN) / (rateN - 1));

  const schedule: ScheduleItem[] = [];
  let balance = principal;
  let totalInterest = 0;
  let currentDate = new Date(startDate);

  for (let i = 1; i <= installments; i++) {
    currentDate = getNextPaymentDate(currentDate, frequency);

    const interestComponent = roundTo2(balance * periodicRate);
    let principalComponent = roundTo2(emi - interestComponent);

    // Last installment: adjust for rounding
    if (i === installments) {
      principalComponent = balance;
    }

    balance = roundTo2(balance - principalComponent);
    totalInterest = roundTo2(totalInterest + interestComponent);

    schedule.push({
      installmentNumber: i,
      dueDate: new Date(currentDate),
      principalAmount: principalComponent,
      interestAmount: interestComponent,
      totalAmount: roundTo2(principalComponent + interestComponent),
      balanceAfter: Math.max(0, balance),
    });
  }

  return {
    principal,
    totalInterest,
    totalDue: roundTo2(principal + totalInterest),
    installmentAmount: emi,
    numberOfInstallments: installments,
    schedule,
  };
}

// ── Helper functions ──────────────────────────────────

function getNumberOfInstallments(durationValue: number, durationUnit: string, frequency: string): number {
  // Convert total duration to days first
  let totalDays: number;
  switch (durationUnit) {
    case 'DAYS':
      totalDays = durationValue;
      break;
    case 'WEEKS':
      totalDays = durationValue * 7;
      break;
    case 'MONTHS':
      totalDays = durationValue * 30; // approximate
      break;
    default:
      totalDays = durationValue * 30;
  }

  // Calculate number of installments based on frequency
  switch (frequency) {
    case 'DAILY':
      return totalDays;
    case 'WEEKLY':
      return Math.ceil(totalDays / 7);
    case 'BIWEEKLY':
      return Math.ceil(totalDays / 14);
    case 'MONTHLY':
      return durationUnit === 'MONTHS' ? durationValue : Math.ceil(totalDays / 30);
    default:
      return durationValue;
  }
}

function getPeriodInYears(durationValue: number, durationUnit: string): number {
  switch (durationUnit) {
    case 'DAYS':
      return durationValue / 365;
    case 'WEEKS':
      return (durationValue * 7) / 365;
    case 'MONTHS':
      return durationValue / 12;
    default:
      return durationValue / 12;
  }
}

function getPeriodicRate(annualRate: number, frequency: string): number {
  const annual = annualRate / 100;
  switch (frequency) {
    case 'DAILY':
      return annual / 365;
    case 'WEEKLY':
      return annual / 52;
    case 'BIWEEKLY':
      return annual / 26;
    case 'MONTHLY':
      return annual / 12;
    default:
      return annual / 12;
  }
}

function getNextPaymentDate(current: Date, frequency: string): Date {
  switch (frequency) {
    case 'DAILY':
      return addDays(current, 1);
    case 'WEEKLY':
      return addWeeks(current, 1);
    case 'BIWEEKLY':
      return addWeeks(current, 2);
    case 'MONTHLY':
      return addMonths(current, 1);
    default:
      return addMonths(current, 1);
  }
}

function roundTo2(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}
