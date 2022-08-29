const Web3 = require('web3')
const Tx = require('ethereumjs-tx').Transaction
const util = require('ethereumjs-util');
const Buffer = require('safe-buffer').Buffer
const setting = require('./setting.json')
const abiJson = require('./abi.json')
const web3 = new Web3('https://api.avax.network/ext/bc/C/rpc')
const common = require('ethereumjs-common');
var express = require('express');
var request = require('request');
var router = express.Router();
const tokenLine = setting.tokenLine


const chain = common.default.forCustomChain(
  'mainnet', {
  name: 'avax',
  networkId: 43114,
  chainId: 43114
},
  'petersburg'
)
const address = setting.account
const privateKey = setting.privateKey
const contractAddress = setting.contract

const abi = abiJson



// --------- Log console --------- //
var log = console.log;
console.log = function () {

  var first_parameter = arguments[0];
  var other_parameters = Array.prototype.slice.call(arguments, 1);

  function formatConsoleDate(date) {
    var hour = date.getHours();
    var minutes = date.getMinutes();
    var seconds = date.getSeconds();
    var milliseconds = date.getMilliseconds();

    return '[' +
      ((hour < 10) ? '0' + hour : hour) +
      ':' +
      ((minutes < 10) ? '0' + minutes : minutes) +
      ':' +
      ((seconds < 10) ? '0' + seconds : seconds) +

      '] ';
  }

  log.apply(console, ['\x1b[32m', formatConsoleDate(new Date()) + first_parameter].concat(other_parameters));
};




const contract = new web3.eth.Contract(abi, contractAddress, { form: address })
const delay = ms => new Promise(resolve => setTimeout(resolve, ms))
let gasPrice = util.bufferToHex(10 * 10 ** 10)
let gasLimit = util.bufferToHex(400000)
let gasPriceSettle = util.bufferToHex(7 * 10 ** 10)

async function getTransaction(address) {
  const nonce = await web3.eth.getTransactionCount(address)
  return util.bufferToHex(nonce)
}


async function getStamina(plantToken) {
  const getStamina = await contractStamina.methods.getStamina(plantToken).call()
  return getStamina
}

async function getTeamInfo(teamId) {
  var checkTime = false
  const getStamina = await contract.methods.getTeamInfo(teamId).call()
  var nextAttack = parseInt(getStamina.lockTo)
  var nowTimeSub = new Date().getTime()
  var nowTime = parseInt(nowTimeSub.toString().substr(0, 10))
  var sum = nextAttack - nowTime
  var obj = {}
  if (sum <= 0) {
    checkTime = true
    obj = {
      "checkTime": checkTime,
      "currentGameId": getStamina.currentGameId
    }
  } else {

    const dateObject = new Date(nextAttack * 1000)
    const humanDateFormat = dateObject.toLocaleString()
    console.log("Cooldown please wait! :) " + dateObject.toLocaleString().substring(12, 23));
    obj = {
      "checkTime": checkTime,
      "currentGameId": getStamina.currentGameId
    }
    await delay(sum * 1000)
  }
  return obj
}

async function getState() {
  var getTra = await web3.eth.getTransaction('0xb977b710d569bdaab5f7da889d17a4525a41e0de172f3d01f5cc5fa1af04ad8b')

  console.log(getTra);
}

async function settle(gameId) {

  try {

    console.log("Please wait settleing: " + gameId);
    const nonce = await getTransaction(address)
    rawTx = {
      'nonce': nonce,
      'gasPrice': gasPriceSettle,
      'gasLimit': gasLimit,
      'from': address,
      'to': contractAddress,
      'value': '0x',
      'data': contract.methods.settleGame(gameId).encodeABI()
    }
    let tx = new Tx(rawTx, { common: chain });
    tx.sign(new Buffer.from(privateKey, 'hex'))
    let serializedTrans = tx.serialize()
    const result = await web3.eth.sendSignedTransaction('0x' +
      serializedTrans.toString('hex'))
    console.log(result);
    console.log("Crabara info gameId:" + gameId + " settle success")
    const messageFight = "Crabara info gameId:" + gameId + " settle success"
    await sendNotify(messageFight, tokenLine)

  } catch (error) {
    await Promise.reject(new Error('Error'));
    console.log("Crabara info gameId:" + gameId + " settle fail")
    const messageFight = "Crabara info gameId:" + gameId + " settle fail"
    await sendNotify(messageFight, tokenLine)
  }


}

async function attack(gameId, teamId) {

  var status = true

  try {

    console.log("Please wait attack: " + gameId);
    const nonce = await getTransaction(address)
    rawTx = {
      'nonce': nonce,
      'gasPrice': gasPrice,
      'gasLimit': gasLimit,
      'from': address,
      'to': contractAddress,
      'value': '0x',
      'data': contract.methods.attack(gameId, teamId).encodeABI()
    }
    var messageFight = ""
    let tx = new Tx(rawTx, { common: chain });
    tx.sign(new Buffer.from(privateKey, 'hex'))
    let serializedTrans = tx.serialize()
    const result = await web3.eth.sendSignedTransaction('0x' +
      serializedTrans.toString('hex'))

    status = false
    console.log("Crabara info gameId:" + gameId + " attack success")
    messageFight = "Crabara info gameId:" + gameId + " attack success"
    await sendNotify(messageFight, tokenLine)



  } catch (error) {

    await Promise.reject(new Error('Error'));
    messageFight = "Crabara info gameId:" + gameId + " attack fail"
    await sendNotify(messageFight, tokenLine)
  }


  return status



}

async function getTeamFight() {
  return new Promise((resolve, reject) => {

    const url = "https://idle-api.crabada.com/public/idle/mines?page=1&status=open&looter_address=0x4185185d0328ac80e937b8bbab64869a5cb989aa&can_loot=1&limit=1"

    request.get({
      url: url,
      method: 'GET',
    }, async function (error, response, body) {
      const obj = JSON.parse(body)

      resolve(obj)

    });




  })
}


async function getGasPrice() {
  return new Promise((resolve, reject) => {

    const url = "https://api.debank.com/chain/gas_price_dict_v2?chain=avax"

    request.get({
      url: url,
      method: 'GET',
    }, async function (error, response, body) {
      const obj = JSON.parse(body)

      resolve(obj.data.normal.price / 10 ** 9)

    });




  })
}

async function sendNotify(message, lineToken) {

  try {
    request({
      method: 'POST',
      uri: 'https://notify-api.line.me/api/notify',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      auth: {
        'bearer': lineToken
      },
      form: {
        message: message
      }
    });
  } catch (error) {
    console.error(error);

  }

}

(async () => {

  while (true) {
    var loop = true
    var teamId = 2729
    var data = await getTeamInfo(teamId)
    var gasPrice = 0
    if (data.checkTime) {

      gasPrice = await getGasPrice()
      if (parseInt(gasPrice) < 40) {
        console.log("Gas Low 120  Gas Price ::" + gasPrice);

        var currentGameId = parseInt(data.currentGameId)
        if (currentGameId != 0) {
          await settle(currentGameId).catch(() => {
            console.log("Transaction settle fail");
            loop = false
          });
        }


        while (loop) {
          var po = await getTeamFight()
          for (var key in po.result.data) {
            var obj = po.result.data[key]
            if (obj.defense_point < 659) {
              console.log("GameId: " + obj.game_id + " Power: " + obj.defense_point + " Fight!");
              var result = await attack(obj.game_id, teamId).catch(() => {
                console.log("Transaction fail");
                loop = false
              });
              if (result) {
                loop = false
              }
              loop = false
            }
          }
        }

      } else {
        console.log("Gas Hight 120  Gas :: " + gasPrice);
        await delay(3000)
      }

    } else {
      console.log("Cooldown please wait! :)");
    }

  }
})()

// const web3 = new Web3('https://bsc-dataseed.binance.org/')
// const txCount =  web3.eth.getTransactionCount(account.address)

