import {observable, decorate} from "mobx";
import * as Blockchain from "../blockchainHandler";

import {etherscanTx, methodSig} from '../helpers';

class TransactionsStore {
  registry = {};
  cdpCreationTx = false;
  priceModal = { open: false, title: null, func: null, params: null, settings: {}, callbacks: null };

  checkPendingTransactions = () => {
    Object.keys(this.registry).map(tx => {
      if (this.registry[tx].pending) {
        Blockchain.getTransactionReceipt(tx).then(r => {
          if (r !== null) {
            if (r.status === "0x1") {
              this.logTransactionConfirmed(tx);
            } else {
              this.logTransactionFailed(tx);
            }
          }
        })
      }
      return false;
    });
  }

  cleanCdpCreationProperty = tx => {
    const registry = {...this.registry};
    registry[tx].cdpCreationTx = false;
    this.registry = registry;
  }
  
  logRequestTransaction = (id, title, cdpCreationTx) => {
    this.cdpCreationTx = cdpCreationTx;
    const msgTemp = 'Waiting for transaction signature...';
    this.notificator.info(id, title, msgTemp, false);
  }

  closePriceModal = () => {
    this.priceModal = { open: false, title: null, func: null, params: null, settings: {}, callbacks: null };
  }

  setPriceAndSend = (title, func, params, settings, callbacks) => {
    this.priceModal = { open: true, title, func, params, settings, callbacks };
  }

  sendTransaction = gasPriceGwei => {
    const id = Math.random();
    const {func, params, settings, title, callbacks} = {...this.priceModal};
    const cdpCreationTx = typeof params[1] === 'string' && methodSig('lockAndDraw(address,uint256)') === params[1].substring(0, 10);
    this.logRequestTransaction(id, title, cdpCreationTx);
    settings.gasPrice = gasPriceGwei * 10 ** 9;
    func(...params, settings, (e, tx) => this.log(e, tx, id, title, callbacks));
    this.priceModal = { open: false, title: null, func: null, params: null, settings: {}, callbacks: null };
  }
  
  logPendingTransaction = (id, tx, title, callbacks = []) => {
    const msgTemp = 'Transaction TX was created. Waiting for confirmation...';
    const registry = {...this.registry};
    registry[tx] = {pending: true, title, callbacks, cdpCreationTx: this.cdpCreationTx};
    this.registry = registry;
    this.cdpCreationTx = false;
    console.log(msgTemp.replace('TX', tx));
    this.notificator.hideNotification(id);
    if (!this.registry[tx].cdpCreationTx) {
      this.notificator.info(tx, title, etherscanTx(this.network.network, msgTemp.replace('TX', `${tx.substring(0,10)}...`), tx), false);
    }
  }
  
  logTransactionConfirmed = tx => {
    const msgTemp = 'Transaction TX was confirmed.';
    if (this.registry[tx] && this.registry[tx].pending) {
      const registry = {...this.registry};
      registry[tx].pending = false;
      this.registry = registry;
      console.log(msgTemp.replace('TX', tx));
      this.notificator.hideNotification(tx);
      if (!this.registry[tx].cdpCreationTx) {
        this.notificator.success(tx, this.registry[tx].title, etherscanTx(this.network.network, msgTemp.replace('TX', `${tx.substring(0,10)}...`), tx), 6000);
      }
      if (typeof this.registry[tx].callbacks !== 'undefined' && this.registry[tx].callbacks.length > 0) {
        this.registry[tx].callbacks.forEach(callback => this.executeCallback(callback));
      }
    }
  }
  
  logTransactionFailed = tx => {
    const msgTemp = 'Transaction TX failed.';
    if (this.registry[tx]) {
      const registry = {...this.registry};
      registry[tx].pending = false;
      this.registry = registry;
      if (!this.registry[tx].cdpCreationTx) {
        this.notificator.error(tx, this.registry[tx].title, msgTemp.replace('TX', `${tx.substring(0,10)}...`), 4000);
      }
    }
  }
  
  logTransactionRejected = (tx, title, customMessage = null) => {
    const msg = 'User denied transaction signature.';
    this.notificator.error(tx, title, customMessage ? customMessage : msg, 4000);
  }
  
  log = (e, tx, id, title, callbacks = []) => {
    if (!e) {
      this.logPendingTransaction(id, tx, title, callbacks);
    } else {
      console.log(e);
      this.logTransactionRejected(id, title);
    }
  }

  executeCallback = args => {
    let method = args.shift();
    // If the callback is to execute a getter function is better to wait as sometimes the new value is not uopdated instantly when the tx is confirmed
    const timeout = ['system/checkAllowance', 'system/lockAndDraw', 'system/wipeAndFree', 'system/lock', 'system/draw', 'system/wipe', 'system/free', 'system/shut', 'system/give', 'system/migrateCDP'].indexOf(method) !== -1 ? 0 : 5000;
    setTimeout(() => {
      method = method.split('/');
      console.log('executeCallback', `${method[0]}.${method[1]}`, args);
      this[method[0]][method[1]](...args);
    }, timeout);
  }
}

decorate(TransactionsStore, {
  registry: observable,
  priceModal: observable
});

const store = new TransactionsStore();
export default store;
