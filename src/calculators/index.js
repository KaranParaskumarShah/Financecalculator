// Registry: one calculator = one config. To add a calculator, build its folder under
// src/calculators/<id>/, add its meta in meta.js (status: 'live'), and register it here.
import { CALCULATOR_META } from './meta.js'
import sip from './sip/index.js'
import emi from './emi/index.js'
import retirement from './retirement/index.js'
import compound from './compound/index.js'
import rentvsbuy from './rentvsbuy/index.js'
import tax from './tax/index.js'
import card from './card/index.js'
import networth from './networth/index.js'
import emergency from './emergency/index.js'
import goal from './goal/index.js'
import inflation from './inflation/index.js'
import cagr from './cagr/index.js'

export const CONFIGS = { sip, emi, retirement, compound, rentvsbuy, tax, card, networth, emergency, goal, inflation, cagr }

export const LIVE_CALCULATORS = CALCULATOR_META.filter((m) => m.status === 'live' && CONFIGS[m.id]).map((m) => ({ meta: m, config: CONFIGS[m.id] }))
