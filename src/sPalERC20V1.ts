import { LogRebase, sPalERC20 } from '../generated/sPalERC20/sPalERC20'
import { PalERC20 } from '../generated/sPalERC20/PalERC20'
import { Rebase } from '../generated/schema'
import { Address, BigInt, log } from '@graphprotocol/graph-ts'
import {EEECADIN_ERC20_CONTRACT, SEEECADIN_ERC20_CONTRACT_V1, STAKING_CONTRACT_V1} from './utils/Constants'
import { toDecimal } from './utils/Decimals'
import {getPaladinUSDRate} from './utils/Price';
import { handleBlock } from './PalStaking'

export function rebaseFunction(event: LogRebase): void {

    let rebaseId = event.transaction.hash.toHex()
    var rebase = Rebase.load(rebaseId)
    log.debug("Rebase_V1 event on TX {} with percent {}", [rebaseId, toDecimal(event.params.rebase, 9).toString()])

    if (rebase == null && event.params.rebase.gt(BigInt.fromI32(0))) {
        let pal_contract = PalERC20.bind(Address.fromString(EEECADIN_ERC20_CONTRACT))
        let spal_contract = sPalERC20.bind(Address.fromString(SEEECADIN_ERC20_CONTRACT_V1))

        // First rebase starts from 3th epoch
        let last_rebase = spal_contract.rebases(event.params.epoch.minus(BigInt.fromI32(3)))

        rebase = new Rebase(rebaseId)
        rebase.amount = toDecimal(last_rebase.value4, 9)
        rebase.stakedPals = toDecimal(pal_contract.balanceOf(Address.fromString(STAKING_CONTRACT_V1)), 9)
        rebase.contract = STAKING_CONTRACT_V1
        rebase.percentage = rebase.amount.div(rebase.stakedPals)
        rebase.transaction = rebaseId
        rebase.timestamp = event.block.timestamp
        rebase.value = rebase.amount.times(getPaladinUSDRate())
        rebase.save()
    }

    handleBlock(event.block)
}