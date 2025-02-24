'use strict';

// ---------------------------------------------------------------------------

const Exchange = require ('./base/Exchange');
const Precise = require ('./base/Precise');

// ---------------------------------------------------------------------------

module.exports = class bl3p extends Exchange {
    describe () {
        return this.deepExtend (super.describe (), {
            'id': 'bl3p',
            'name': 'BL3P',
            'countries': [ 'NL' ], // Netherlands
            'rateLimit': 1000,
            'version': '1',
            'comment': 'An exchange market by BitonicNL',
            'has': {
                'CORS': undefined,
                'spot': true,
                'margin': false,
                'swap': false,
                'future': false,
                'option': false,
                'cancelOrder': true,
                'createOrder': true,
                'createReduceOnlyOrder': false,
                'fetchBalance': true,
                'fetchBorrowRate': false,
                'fetchBorrowRateHistory': false,
                'fetchBorrowRates': false,
                'fetchBorrowRatesPerSymbol': false,
                'fetchFundingHistory': false,
                'fetchFundingRate': false,
                'fetchFundingRateHistory': false,
                'fetchFundingRates': false,
                'fetchIndexOHLCV': false,
                'fetchIsolatedPositions': false,
                'fetchLeverage': false,
                'fetchMarkOHLCV': false,
                'fetchOrderBook': true,
                'fetchPositions': false,
                'fetchPositionsRisk': false,
                'fetchPremiumIndexOHLCV': false,
                'fetchTicker': true,
                'fetchTrades': true,
                'reduceMargin': false,
                'setLeverage': false,
                'setMarginMode': false,
                'setPositionMode': false,
            },
            'urls': {
                'logo': 'https://user-images.githubusercontent.com/1294454/28501752-60c21b82-6feb-11e7-818b-055ee6d0e754.jpg',
                'api': 'https://api.bl3p.eu',
                'www': 'https://bl3p.eu', // 'https://bitonic.nl'
                'doc': [
                    'https://github.com/BitonicNL/bl3p-api/tree/master/docs',
                    'https://bl3p.eu/api',
                    'https://bitonic.nl/en/api',
                ],
            },
            'api': {
                'public': {
                    'get': [
                        '{market}/ticker',
                        '{market}/orderbook',
                        '{market}/trades',
                    ],
                },
                'private': {
                    'post': [
                        '{market}/money/depth/full',
                        '{market}/money/order/add',
                        '{market}/money/order/cancel',
                        '{market}/money/order/result',
                        '{market}/money/orders',
                        '{market}/money/orders/history',
                        '{market}/money/trades/fetch',
                        'GENMKT/money/info',
                        'GENMKT/money/deposit_address',
                        'GENMKT/money/new_deposit_address',
                        'GENMKT/money/wallet/history',
                        'GENMKT/money/withdraw',
                    ],
                },
            },
            'markets': {
                'BTC/EUR': { 'id': 'BTCEUR', 'symbol': 'BTC/EUR', 'base': 'BTC', 'quote': 'EUR', 'baseId': 'BTC', 'quoteId': 'EUR', 'maker': 0.0025, 'taker': 0.0025, 'type': 'spot', 'spot': true },
                'LTC/EUR': { 'id': 'LTCEUR', 'symbol': 'LTC/EUR', 'base': 'LTC', 'quote': 'EUR', 'baseId': 'LTC', 'quoteId': 'EUR', 'maker': 0.0025, 'taker': 0.0025, 'type': 'spot', 'spot': true },
            },
        });
    }

    parseBalance (response) {
        const data = this.safeValue (response, 'data', {});
        const wallets = this.safeValue (data, 'wallets');
        const result = { 'info': data };
        const codes = Object.keys (this.currencies);
        for (let i = 0; i < codes.length; i++) {
            const code = codes[i];
            const currency = this.currency (code);
            const currencyId = currency['id'];
            const wallet = this.safeValue (wallets, currencyId, {});
            const available = this.safeValue (wallet, 'available', {});
            const balance = this.safeValue (wallet, 'balance', {});
            const account = this.account ();
            account['free'] = this.safeString (available, 'value');
            account['total'] = this.safeString (balance, 'value');
            result[code] = account;
        }
        return this.safeBalance (result);
    }

    async fetchBalance (params = {}) {
        await this.loadMarkets ();
        const response = await this.privatePostGENMKTMoneyInfo (params);
        return this.parseBalance (response);
    }

    parseBidAsk (bidask, priceKey = 0, amountKey = 1) {
        const price = this.safeNumber (bidask, priceKey);
        const size = this.safeNumber (bidask, amountKey);
        return [
            price / 100000.0,
            size / 100000000.0,
        ];
    }

    async fetchOrderBook (symbol, limit = undefined, params = {}) {
        const market = this.market (symbol);
        const request = {
            'market': market['id'],
        };
        const response = await this.publicGetMarketOrderbook (this.extend (request, params));
        const orderbook = this.safeValue (response, 'data');
        return this.parseOrderBook (orderbook, symbol, undefined, 'bids', 'asks', 'price_int', 'amount_int');
    }

    parseTicker (ticker, market = undefined) {
        //
        // {
        //     "currency":"BTC",
        //     "last":32654.55595,
        //     "bid":32552.3642,
        //     "ask":32703.58231,
        //     "high":33500,
        //     "low":31943,
        //     "timestamp":1643372789,
        //     "volume":{
        //         "24h":2.27372413,
        //         "30d":320.79375456
        //     }
        // }
        //
        const symbol = this.safeSymbol (undefined, market);
        const timestamp = this.safeTimestamp (ticker, 'timestamp');
        const last = this.safeString (ticker, 'last');
        const volume = this.safeValue (ticker, 'volume', {});
        return this.safeTicker ({
            'symbol': symbol,
            'timestamp': timestamp,
            'datetime': this.iso8601 (timestamp),
            'high': this.safeString (ticker, 'high'),
            'low': this.safeString (ticker, 'low'),
            'bid': this.safeString (ticker, 'bid'),
            'bidVolume': undefined,
            'ask': this.safeString (ticker, 'ask'),
            'askVolume': undefined,
            'vwap': undefined,
            'open': undefined,
            'close': last,
            'last': last,
            'previousClose': undefined,
            'change': undefined,
            'percentage': undefined,
            'average': undefined,
            'baseVolume': this.safeString (volume, '24h'),
            'quoteVolume': undefined,
            'info': ticker,
        }, market, false);
    }

    async fetchTicker (symbol, params = {}) {
        const market = this.market (symbol);
        const request = {
            'market': market['id'],
        };
        const ticker = await this.publicGetMarketTicker (this.extend (request, params));
        //
        // {
        //     "currency":"BTC",
        //     "last":32654.55595,
        //     "bid":32552.3642,
        //     "ask":32703.58231,
        //     "high":33500,
        //     "low":31943,
        //     "timestamp":1643372789,
        //     "volume":{
        //         "24h":2.27372413,
        //         "30d":320.79375456
        //     }
        // }
        //
        return this.parseTicker (ticker, market);
    }

    parseTrade (trade, market = undefined) {
        const id = this.safeString (trade, 'trade_id');
        const timestamp = this.safeInteger (trade, 'date');
        let priceString = this.safeString (trade, 'price_int');
        priceString = Precise.stringDiv (priceString, '100000');
        let amountString = this.safeString (trade, 'amount_int');
        amountString = Precise.stringDiv (amountString, '100000000');
        const price = this.parseNumber (priceString);
        const amount = this.parseNumber (amountString);
        const cost = this.parseNumber (Precise.stringMul (priceString, amountString));
        let symbol = undefined;
        if (market !== undefined) {
            symbol = market['symbol'];
        }
        return {
            'id': id,
            'info': trade,
            'timestamp': timestamp,
            'datetime': this.iso8601 (timestamp),
            'symbol': symbol,
            'type': undefined,
            'side': undefined,
            'order': undefined,
            'takerOrMaker': undefined,
            'price': price,
            'amount': amount,
            'cost': cost,
            'fee': undefined,
        };
    }

    async fetchTrades (symbol, since = undefined, limit = undefined, params = {}) {
        const market = this.market (symbol);
        const response = await this.publicGetMarketTrades (this.extend ({
            'market': market['id'],
        }, params));
        const result = this.parseTrades (response['data']['trades'], market, since, limit);
        return result;
    }

    async createOrder (symbol, type, side, amount, price = undefined, params = {}) {
        const market = this.market (symbol);
        const order = {
            'market': market['id'],
            'amount_int': parseInt (amount * 100000000),
            'fee_currency': market['quote'],
            'type': (side === 'buy') ? 'bid' : 'ask',
        };
        if (type === 'limit') {
            order['price_int'] = parseInt (price * 100000.0);
        }
        const response = await this.privatePostMarketMoneyOrderAdd (this.extend (order, params));
        const orderId = this.safeString (response['data'], 'order_id');
        return {
            'info': response,
            'id': orderId,
        };
    }

    async cancelOrder (id, symbol = undefined, params = {}) {
        const request = {
            'order_id': id,
        };
        return await this.privatePostMarketMoneyOrderCancel (this.extend (request, params));
    }

    sign (path, api = 'public', method = 'GET', params = {}, headers = undefined, body = undefined) {
        const request = this.implodeParams (path, params);
        let url = this.urls['api'] + '/' + this.version + '/' + request;
        const query = this.omit (params, this.extractParams (path));
        if (api === 'public') {
            if (Object.keys (query).length) {
                url += '?' + this.urlencode (query);
            }
        } else {
            this.checkRequiredCredentials ();
            const nonce = this.nonce ();
            body = this.urlencode (this.extend ({ 'nonce': nonce }, query));
            const secret = this.base64ToBinary (this.secret);
            // eslint-disable-next-line quotes
            const auth = request + "\0" + body;
            const signature = this.hmac (this.encode (auth), secret, 'sha512', 'base64');
            headers = {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Rest-Key': this.apiKey,
                'Rest-Sign': signature,
            };
        }
        return { 'url': url, 'method': method, 'body': body, 'headers': headers };
    }
};
