import type { Entity, CedarIp } from '../types/entity.js'

export interface CedarDecimalValue {
  __extn: {
    fn: 'decimal'
    arg: string
  }
}

export function parseDecimal(value: unknown): number {
  if (typeof value === 'number') return value
  if (typeof value === 'string') return parseFloat(value) || 0
  if (value && typeof value === 'object' && '__extn' in value) {
    const extn = (value as { __extn?: { arg?: string } }).__extn
    if (extn && typeof extn.arg === 'string') return parseFloat(extn.arg) || 0
  }
  return 0
}

export function createDecimalValue(value: string): CedarDecimalValue {
  return {
    __extn: {
      fn: 'decimal',
      arg: value
    }
  }
}

export function toDecimal(value: number, decimalPlaces: number = 4): Entity['attrs']['daily_spend_limit'] {
  const multiplier = Math.pow(10, decimalPlaces)
  const rounded = Math.round(value * multiplier) / multiplier
  const formatted = rounded.toFixed(decimalPlaces)

  return {
    __extn: {
      fn: 'decimal' as const,
      arg: formatted
    }
  }
}

export function toDecimalOne(value: number): Entity['attrs']['years_of_service'] {
  return toDecimal(value, 1) as Entity['attrs']['years_of_service']
}

export function toDecimalFour(value: number): Entity['attrs']['daily_spend_limit'] {
  return toDecimal(value, 4)
}

export function normalizeDecimal(value: any, decimalPlaces: number = 4): Entity['attrs']['daily_spend_limit'] {
  if (!value || !value.__extn || value.__extn.fn !== 'decimal') {
    return toDecimal(0, decimalPlaces)
  }

  const arg = value.__extn.arg
  if (!arg.includes('.')) {
    return toDecimal(parseFloat(arg) || 0, decimalPlaces)
  }

  const numValue = parseFloat(arg) || 0
  return toDecimal(numValue, decimalPlaces)
}

export function toIp(value: string): CedarIp {
  return {
    __extn: {
      fn: 'ip' as const,
      arg: value
    }
  }
}
