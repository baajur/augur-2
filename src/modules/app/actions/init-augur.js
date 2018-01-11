import * as AugurJS from 'services/augurjs'
import { updateEnv } from 'modules/app/actions/update-env'
import { updateConnectionStatus, updateAugurNodeConnectionStatus } from 'modules/app/actions/update-connection'
import { updateContractAddresses } from 'modules/contracts/actions/update-contract-addresses'
import { updateFunctionsAPI, updateEventsAPI } from 'modules/contracts/actions/update-contract-api'
import { setLoginAccount } from 'modules/auth/actions/set-login-account'
import { loadUniverse } from 'modules/app/actions/load-universe'
import { registerTransactionRelay } from 'modules/transactions/actions/register-transaction-relay'
import logError from 'utils/log-error'

export function initAugur(history, callback = logError) {
  return (dispatch, getState) => {
    const xhttp = new XMLHttpRequest()
    xhttp.onreadystatechange = () => {
      if (xhttp.readyState === 4) {
        if (xhttp.status === 200) {
          const env = JSON.parse(xhttp.responseText)
          dispatch(updateEnv(env))
          AugurJS.connect(env, (err, ethereumNodeConnectionInfo) => {
            if (err) return callback(err)
            dispatch(updateConnectionStatus(true))
            dispatch(updateContractAddresses(ethereumNodeConnectionInfo.contracts))
            dispatch(updateFunctionsAPI(ethereumNodeConnectionInfo.abi.functions))
            dispatch(updateEventsAPI(ethereumNodeConnectionInfo.abi.events))
            dispatch(updateAugurNodeConnectionStatus(true))
            dispatch(registerTransactionRelay())
            dispatch(setLoginAccount(env['auto-login'], ethereumNodeConnectionInfo.coinbase))
            dispatch(loadUniverse(env.universe || AugurJS.augur.contracts.addresses[AugurJS.augur.rpc.getNetworkID()].Universe, history))
            callback()
          })
        } else {
          callback(xhttp.statusText)
        }
      }
    }
    xhttp.open('GET', 'config/env.json', true)
    xhttp.send()
  }
}
