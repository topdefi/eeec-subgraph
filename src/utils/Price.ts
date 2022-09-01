import {
    PANCAKE_EEECADINBUSD_PAIR,
    // TRADERJOE_USDCAVAX_PAIR,
} from './Constants'
import { Address, BigDecimal, BigInt, log } from '@graphprotocol/graph-ts'
import { UniswapV2Pair } from '../../generated/PalStaking/UniswapV2Pair';
import { toDecimal } from './Decimals'


let BIG_DECIMAL_1E9 = BigDecimal.fromString('1e9')
let BIG_DECIMAL_1E12 = BigDecimal.fromString('1e12')

// export function getAVAXUSDRate(): BigDecimal {
//     let pair = UniswapV2Pair.bind(Address.fromString(TRADERJOE_USDCAVAX_PAIR))

//     let reserves = pair.getReserves()
//     let reserve0 = reserves.value0.toBigDecimal() // USDC
//     let reserve1 = reserves.value1.toBigDecimal() // AVAX

//     let avaxRate = reserve0.div(reserve1).times(BIG_DECIMAL_1E12)
//     log.debug("AVAX rate {}", [avaxRate.toString()])

//     return avaxRate
// }

export function getPaladinUSDRate(): BigDecimal {
    let pair = UniswapV2Pair.bind(Address.fromString(PANCAKE_EEECADINBUSD_PAIR))

    let reserves = pair.getReserves()
    let reserve0 = reserves.value0.toBigDecimal() // xyz
    let reserve1 = reserves.value1.toBigDecimal() // BUSD

    let xyzRate = reserve1.div(reserve0).div(BIG_DECIMAL_1E9)
    log.debug("Paladin rate {}", [xyzRate.toString()])

    return xyzRate
}

//(slp_treasury/slp_supply)*(2*sqrt(lp_dai * lp_hec))
export function getDiscountedPairUSD(lp_amount: BigInt, total_lp: BigDecimal, reserves: BigDecimal[], tokenRate: BigDecimal): BigDecimal{
    let lp_token_1 = reserves[0]
    let lp_token_2 = reserves[1]
    let kLast = lp_token_1.times(lp_token_2.times(tokenRate)).truncate(0).digits

    let part1 = toDecimal(lp_amount,18).div(total_lp)
    let two = BigInt.fromI32(2)

    let sqrt = kLast.sqrt();
    let part2 = toDecimal(two.times(sqrt), 0)
    let result = part1.times(part2)
    return result
}

export function getPairUSD(lp_amount: BigInt, total_lp: BigDecimal, reserves: BigDecimal[], token0Rate: BigDecimal, token1Rate: BigDecimal): BigDecimal{
    let lp_token_0 = reserves[0]
    let lp_token_1 = reserves[1]
    let ownedLP = toDecimal(lp_amount,18).div(total_lp)
    let token_0_value = lp_token_0.times(token0Rate)
    let token_1_value = lp_token_1.times(token1Rate)
    let total_lp_usd = token_0_value.plus(token_1_value)

    return ownedLP.times(total_lp_usd)
}
