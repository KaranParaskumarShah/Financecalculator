import { TrendingUp, Landmark, Sunset, Clock, Home, Receipt, CreditCard, Gauge, LifeBuoy, Target, Flame, LineChart, Calculator } from 'lucide-react'

const MAP = { TrendingUp, Landmark, Sunset, Clock, Home, Receipt, CreditCard, Gauge, LifeBuoy, Target, Flame, LineChart }
export const iconFor = (name) => MAP[name] || Calculator
