import {Address, BigDecimal, BigInt, log} from '@graphprotocol/graph-ts'
import {PalERC20} from '../../generated/PalStaking/PalERC20';
import {sPalERC20} from '../../generated/PalStaking/sPalERC20';
import {CirculatingSupply} from '../../generated/PalStaking/CirculatingSupply';
import {ERC20} from '../../generated/PalStaking/ERC20';
import {UniswapV2Pair} from '../../generated/PalStaking/UniswapV2Pair';
import {PalStaking} from '../../generated/PalStaking/PalStaking';
import {ethereum} from '@graphprotocol/graph-ts'

import {ProtocolMetric, LastBlock} from '../../generated/schema'
import {
    CIRCULATING_SUPPLY_CONTRACT,
    CIRCULATING_SUPPLY_CONTRACT_BLOCK,
    EEECADIN_ERC20_CONTRACT,
    SEEECADIN_ERC20_CONTRACT_V1,
    STAKING_CONTRACT_V1,
    TREASURY_ADDRESS,
    USDT_ERC20_CONTRACT,
    USDC_ERC20_CONTRACT,
    DAI_ERC20_CONTRACT,
    // WAVAX_ERC20_CONTRACT,
    PANCAKE_EEECADINBUSD_PAIR,
    // STAKING_CONTRACT_V2_BLOCK,
    // STAKING_CONTRACT_V2,
    // SEEECADIN_ERC20_CONTRACT_V2_BLOCK,
    // SEEECADIN_ERC20_CONTRACT_V2,
    BUSD_ERC20_CONTRACT,
    // TRADERJOE_EEECAVAX_PAIR,
    // TRADERJOE_EEECAVAX_PAIR_BLOCK,
} from './Constants';
import {toDecimal} from './Decimals';
import {getPaladinUSDRate, getDiscountedPairUSD, getPairUSD} from './Price';


export function loadOrCreateProtocolMetric(blockNumber: BigInt, timestamp: BigInt): ProtocolMetric {
  // Around 4 hours for avalanche network
    let id = blockNumber.minus(blockNumber.mod(BigInt.fromString("10000")));

    let protocolMetric = ProtocolMetric.load(id.toString())
    if (protocolMetric == null) {
        protocolMetric = new ProtocolMetric(id.toString())
        protocolMetric.timestamp = timestamp
        protocolMetric.palCirculatingSupply = BigDecimal.fromString("0")
        protocolMetric.sPalCirculatingSupply = BigDecimal.fromString("0")
        protocolMetric.totalSupply = BigDecimal.fromString("0")
        protocolMetric.palPrice = BigDecimal.fromString("0")
        protocolMetric.marketCap = BigDecimal.fromString("0")
        protocolMetric.totalValueLocked = BigDecimal.fromString("0")
        protocolMetric.treasuryRiskFreeValue = BigDecimal.fromString("0")
        protocolMetric.treasuryMarketValue = BigDecimal.fromString("0")
        protocolMetric.treasuryInvestments = BigDecimal.fromString("0")
        protocolMetric.nextEpochRebase = BigDecimal.fromString("0")
        protocolMetric.nextDistributedPal = BigDecimal.fromString("0")
        protocolMetric.currentAPY = BigDecimal.fromString("0")
        protocolMetric.treasuryBUSDRiskFreeValue = BigDecimal.fromString("0")
        protocolMetric.treasuryBUSDMarketValue = BigDecimal.fromString("0")
        // protocolMetric.treasuryUsdtRiskFreeValue = BigDecimal.fromString("0")
        protocolMetric.treasuryUsdtMarketValue = BigDecimal.fromString("0")
        protocolMetric.treasuryBUSDFreeValue = BigDecimal.fromString("0")
        protocolMetric.treasuryStableFreeValue = BigDecimal.fromString("0")
        protocolMetric.treasuryPalBusdPOL = BigDecimal.fromString("0")
        protocolMetric.treasuryUsdcMarketValue = BigDecimal.fromString("0")
        protocolMetric.treasuryDaiMarketValue = BigDecimal.fromString("0")
        // protocolMetric.treasuryPalAvaxPOL = BigDecimal.fromString("0")
        protocolMetric.save()
    }
    return protocolMetric as ProtocolMetric
}


function getTotalSupply(): BigDecimal {
    let pal_contract = PalERC20.bind(Address.fromString(EEECADIN_ERC20_CONTRACT))
    let total_supply = toDecimal(pal_contract.totalSupply(), 9)
    log.debug("Total Supply {}", [total_supply.toString()])
    return total_supply
}

function getCriculatingSupply(blockNumber: BigInt, total_supply: BigDecimal): BigDecimal {
    let circ_supply: BigDecimal
    if (blockNumber.gt(BigInt.fromString(CIRCULATING_SUPPLY_CONTRACT_BLOCK))) {
        let circulatingsupply_contract = CirculatingSupply.bind(Address.fromString(CIRCULATING_SUPPLY_CONTRACT))
        circ_supply = toDecimal(circulatingsupply_contract.EEECCirculatingSupply(), 9)
    } else {
        circ_supply = total_supply;
    }
    log.debug("Circulating Supply {}", [circ_supply.toString()])
    return circ_supply
}

function getSPalSupply(blockNumber: BigInt): BigDecimal {
    let spal_contract_v1 = sPalERC20.bind(Address.fromString(SEEECADIN_ERC20_CONTRACT_V1))
    let spal_supply = toDecimal(spal_contract_v1.circulatingSupply(), 9)

    // if (blockNumber.gt(BigInt.fromString(SEEECADIN_ERC20_CONTRACT_V2_BLOCK))) {
    //     let spal_contract_v2 = sPalERC20.bind(Address.fromString(SEEECADIN_ERC20_CONTRACT_V2))
    //     spal_supply = spal_supply.plus(toDecimal(spal_contract_v2.circulatingSupply(), 9))
    // }

    log.debug("sPal Supply {}", [spal_supply.toString()])
    return spal_supply
}

function getEEECBUSDReserves(pair: UniswapV2Pair): BigDecimal[] {
    let reserves = pair.getReserves()
    let busdReserves = toDecimal(reserves.value1, 18)
    let palReserves = toDecimal(reserves.value0, 9)
    return [palReserves, busdReserves]
}

function getMV_RFV(blockNumber: BigInt): BigDecimal[] {
    let busdERC20 = ERC20.bind(Address.fromString(BUSD_ERC20_CONTRACT))
    let usdtERC20 = ERC20.bind(Address.fromString(USDT_ERC20_CONTRACT))
    let usdcERC20 = ERC20.bind(Address.fromString(USDC_ERC20_CONTRACT))
    let daiERC20 = ERC20.bind(Address.fromString(DAI_ERC20_CONTRACT))
    // let wavaxERC20 = ERC20.bind(Address.fromString(WAVAX_ERC20_CONTRACT))

    let palbusdPair = UniswapV2Pair.bind(Address.fromString(PANCAKE_EEECADINBUSD_PAIR))
    // let palavaxPair = UniswapV2Pair.bind(Address.fromString(TRADERJOE_EEECAVAX_PAIR))

    let busdBalance = busdERC20.balanceOf(Address.fromString(TREASURY_ADDRESS))
    let usdtBalance = usdtERC20.balanceOf(Address.fromString(TREASURY_ADDRESS))
    let usdcBalance = usdcERC20.balanceOf(Address.fromString(TREASURY_ADDRESS))
    let daiBalance = daiERC20.balanceOf(Address.fromString(TREASURY_ADDRESS))
    // let wavaxBalance = wavaxERC20.balanceOf(Address.fromString(TREASURY_ADDRESS))
    // let wavaxValue = toDecimal(wavaxBalance, 18).times(getAVAXUSDRate())

    let palusdRate = getPaladinUSDRate()
    // let wavaxRate = getAVAXUSDRate()

    //EEECBUSD
    let palbusdBalance = palbusdPair.balanceOf(Address.fromString(TREASURY_ADDRESS))
    let palbusdTotalLP = toDecimal(palbusdPair.totalSupply(), 18)
    let palbusdReserves = getEEECBUSDReserves(palbusdPair)
    let palbusdPOL = toDecimal(palbusdBalance, 18).div(palbusdTotalLP).times(BigDecimal.fromString("100"))
    let palbusdValue = getPairUSD(palbusdBalance, palbusdTotalLP, palbusdReserves, palusdRate, BigDecimal.fromString('1'))
    let palbusdRFV = getDiscountedPairUSD(palbusdBalance, palbusdTotalLP, palbusdReserves, BigDecimal.fromString('1'))

    //EEECAVAX
    // let palavaxValue = BigDecimal.fromString('0');
    // let palavaxRFV = BigDecimal.fromString('0')
    // let palavaxPOL = BigDecimal.fromString('0')
    // if (blockNumber.gt(BigInt.fromString(TRADERJOE_EEECAVAX_PAIR_BLOCK))) {
    //     let palavaxBalance = palavaxPair.balanceOf(Address.fromString(TREASURY_ADDRESS))
    //     let palavaxTotalLP = toDecimal(palavaxPair.totalSupply(), 18)
    //     let palavaxReserves = getEEECAVAXReserves(palavaxPair)
    //     palavaxPOL = toDecimal(palavaxBalance, 18).div(palavaxTotalLP).times(BigDecimal.fromString("100"))
    //     palavaxValue = getPairUSD(palavaxBalance, palavaxTotalLP, palavaxReserves, palusdRate, wavaxRate)
    //     palavaxRFV = getDiscountedPairUSD(palavaxBalance, palavaxTotalLP, palavaxReserves, wavaxRate)
    // }

    let stableValueDecimal = toDecimal(busdBalance, 18)
        .plus(toDecimal(usdcBalance, 18)).plus(toDecimal(daiBalance, 18))

    let lpValue = palbusdValue
    let rfvLpValue = palbusdRFV

    let mv = stableValueDecimal.plus(lpValue)
    let rfv = stableValueDecimal.plus(rfvLpValue)

    log.debug("Treasury Market Value {}", [mv.toString()])
    log.debug("Treasury RFV {}", [rfv.toString()])
    log.debug("Treasury BUSD value {}", [toDecimal(busdBalance, 18).toString()])
    log.debug("Treasury USDT value {}", [toDecimal(usdtBalance, 18).toString()])
    log.debug("Treasury USDC value {}", [toDecimal(usdcBalance, 18).toString()])
    log.debug("Treasury DAI value {}", [toDecimal(daiBalance, 18).toString()])
    // log.debug("Treasury WAVAX value {}", [wavaxValue.toString()])
    log.debug("Treasury EEEC-BUSD RFV {}", [palbusdRFV.toString()])
    log.debug("palbusdValue {}", [palbusdValue.toString()])
    // log.debug("Treasury EEEC-AVAX RFV {}", [palavaxRFV.toString()])

    return [
        mv,
        rfv,
        // treasuryBusdRiskFreeValue = DAI RFV + DAI
        palbusdRFV,
        // treasuryBusdMarketValue = DAI LP + DAI
        palbusdValue.plus(toDecimal(busdBalance, 18)),
        //usdt
        toDecimal(usdtBalance, 18),
        //busd
        toDecimal(busdBalance, 18),
        //sBond
        stableValueDecimal,
        // treasuryAvaxMarketValue = Avax LP + Avax
        // palavaxValue.plus(toDecimal(wavaxBalance, 18)),
        // treasuryAvaxRiskFreeValue = Avax RFV + Avax
        // palavaxRFV.plus(toDecimal(wavaxBalance, 18)),
        // POL
        palbusdPOL,
        toDecimal(usdcBalance, 18),
        toDecimal(daiBalance, 18),
        // palavaxPOL,
    ]
}

function getNextEEECRebase(blockNumber: BigInt): BigDecimal {
    let staking_contract_v1 = PalStaking.bind(Address.fromString(STAKING_CONTRACT_V1))
    let distribution_v1 = toDecimal(staking_contract_v1.epoch().value3, 9)
    log.debug("next_distribution v1 {}", [distribution_v1.toString()])
    let next_distribution = distribution_v1

    // if (blockNumber.gt(BigInt.fromString(STAKING_CONTRACT_V2_BLOCK))) {
    //     let staking_contract_v2 = PalStaking.bind(Address.fromString(STAKING_CONTRACT_V2))
    //     let distribution_v2 = toDecimal(staking_contract_v2.epoch().value3, 9)
    //     log.debug("next_distribution v2 {}", [distribution_v2.toString()])
    //     next_distribution = next_distribution.plus(distribution_v2)
    // }

    log.debug("next_distribution total {}", [next_distribution.toString()])

    return next_distribution
}

function getAPY_Rebase(sEEEC: BigDecimal, distributedEEEC: BigDecimal): BigDecimal[] {
    let nextEpochRebase = sEEEC.gt(BigDecimal.fromString('0'))
        ? distributedEEEC.div(sEEEC).times(BigDecimal.fromString("100"))
        : BigDecimal.fromString('0');

    let nextEpochRebase_number = parseFloat(nextEpochRebase.toString())
    let currentAPY = Math.pow(((Math.min(90, nextEpochRebase_number) / 100) + 1), (365 * 3) - 1) * 100

    let currentAPYdecimal = BigDecimal.fromString(currentAPY.toString())

    log.debug("next_rebase {}", [nextEpochRebase.toString()])
    log.debug("current_apy total {}", [currentAPYdecimal.toString()])

    return [currentAPYdecimal, nextEpochRebase]
}

function getRunway(sPal: BigDecimal, rfv: BigDecimal, rebase: BigDecimal): BigDecimal {
    let runwayCurrent = BigDecimal.fromString("0")

    if (sPal.gt(BigDecimal.fromString("0")) && rfv.gt(BigDecimal.fromString("0")) && rebase.gt(BigDecimal.fromString("0"))) {
        let treasury_runway = parseFloat(rfv.div(sPal).toString())

        let nextEpochRebase_number = parseFloat(rebase.toString()) / 100
        let runwayCurrent_num = (Math.log(treasury_runway) / Math.log(1 + nextEpochRebase_number)) / 3;

        runwayCurrent = BigDecimal.fromString(runwayCurrent_num.toString())
    }

    return runwayCurrent
}


export function updateProtocolMetrics(blockNumber: BigInt, timestamp: BigInt): void {
    let pm = loadOrCreateProtocolMetric(blockNumber, timestamp);

    //Total Supply
    pm.totalSupply = getTotalSupply()

    //Circ Supply
    pm.palCirculatingSupply = getCriculatingSupply(blockNumber, pm.totalSupply)

    //sPal Supply
    pm.sPalCirculatingSupply = getSPalSupply(blockNumber)

    //EEEC Price
    pm.palPrice = getPaladinUSDRate()

    //EEEC Market Cap
    pm.marketCap = pm.palCirculatingSupply.times(pm.palPrice)

    //Total Value Locked
    pm.totalValueLocked = pm.sPalCirculatingSupply.times(pm.palPrice)

    //Treasury RFV and MV
    let mv_rfv = getMV_RFV(blockNumber)
    pm.treasuryMarketValue = mv_rfv[0]
    pm.treasuryRiskFreeValue = mv_rfv[1]
    pm.treasuryBUSDRiskFreeValue = mv_rfv[2]
    pm.treasuryBUSDMarketValue = mv_rfv[3]
    // pm.treasuryUsdtRiskFreeValue = mv_rfv[4]
    pm.treasuryUsdtMarketValue = mv_rfv[4]
    pm.treasuryBUSDFreeValue = mv_rfv[5]
    pm.treasuryStableFreeValue = mv_rfv[6]
    pm.treasuryPalBusdPOL = mv_rfv[7]
    pm.treasuryUsdcMarketValue = mv_rfv[8]
    pm.treasuryDaiMarketValue = mv_rfv[9]
    // pm.treasuryPalAvaxPOL = mv_rfv[9]

    // Rebase rewards, APY, rebase
    pm.nextDistributedPal = getNextEEECRebase(blockNumber)
    let apy_rebase = getAPY_Rebase(pm.sPalCirculatingSupply, pm.nextDistributedPal)
    pm.currentAPY = apy_rebase[0]
    pm.nextEpochRebase = apy_rebase[1]

    //Runway
    pm.runwayCurrent = getRunway(pm.sPalCirculatingSupply, pm.treasuryRiskFreeValue, pm.nextEpochRebase)

    pm.save()
}

export function handleBlock(block: ethereum.Block): void {
    let lastBlock = LastBlock.load('0')
    // Around 5 minutes in avalanche network (1 block per ~1.5 seconds)
    if (lastBlock == null || block.number.minus(lastBlock.number).gt(BigInt.fromString('50'))) {
        lastBlock = new LastBlock('0')
        lastBlock.number = block.number
        lastBlock.timestamp = block.timestamp
        lastBlock.save()
        updateProtocolMetrics(block.number, block.timestamp)
    }
}
