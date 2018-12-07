const express = require('express');
const math = require('mathjs');
// const console = require('console');
const debug = require('debug')('app:statementRoutes');
const db = require('./db');

const statementRouter = express.Router();

module.exports = function router() {
  // Statement Flows
  statementRouter.route('/balance')
    .get((req, res) => {
      if (req.user) {
        db.query('SELECT * FROM details_table, transaction_table, account_table, currency_table '
          + 'WHERE at_user_id = dt_userID AND at_account_id = dt_accountID '
          + 'AND tt_user_id = dt_userID AND tt_transaction_id = dt_transactionID AND dt_userID = ? '
          + 'AND account_type = ? AND tt_currency = ct_from AND ct_to = "USD" AND ct_date = tt_date ORDER BY dt_accountID, tt_date ASC, dt_transactionID;',
        [req.user.username, 'Balance'],
        (err, results) => {
          const start_amount = [];
          const change_amount = [];
          const end_amount = [];
          const accountId = [];
          const accountName = [];
          if (err) {
            debug(err);
            res.status(500).json({ message: 'An error has occurred when getting data from database' });
          } else {
            let start = 0;
            let total_change = 0;
            for (let i = 0; i < results.length; i += 1) {
              let end = 0;
              accountId.push(results[i].dt_accountID);
              accountName.push(results[i].at_account_name);
              // credit not null for first transaction
              if (results[i].dt_credit) {
                end -= results[i].dt_credit * results[i].ct_rate;
                start_amount.push(results[i].dt_credit * results[i].ct_rate);
                start = -results[i].dt_credit * results[i].ct_rate;
              }
              // debit not null for first transaction
              else if (results[i].dt_debit) {
                end += results[i].dt_debit * results[i].ct_rate;
                start_amount.push(results[i].dt_debit * results[i].ct_rate);
                start = results[i].dt_debit * results[i].ct_rate;
              }
              if (i === results.length - 1) {
                if (end < 0) {
                  start_amount.push(math.abs(end));
                  change_amount.push(math.abs(end));
                  end_amount.push(math.abs(end));
                } else {
                  start_amount.push(end);
                  change_amount.push(end);
                  end_amount.push(end);
                }
                break;
              }
              // loop through same account_id
              while (results[i].dt_accountID === results[i + 1].dt_accountID) {
                if (results[i + 1].dt_credit) { end -= results[i + 1].dt_credit * results[i + 1].ct_rate; }
                else if (results[i + 1].dt_debit) { end += results[i + 1].dt_debit * results[i + 1].ct_rate; }
                i++;
                if (i >= results.length - 1) { break; }
              }
              // push the end amount for each account
              if (end < 0) {
                end_amount.push(math.abs(end));
              } else {
                end_amount.push(end);
              }
              // calculate the total change amount
              total_change = end - start;
              if (total_change < 0) {change_amount.push(math.abs(total_change));}
              else {change_amount.push(total_change);}
            }
            // deal with return object
            const obj = {};
            const output = [];
            for (let i = 0; i < accountId.length; i += 1) {
              obj.i = {
                account: accountName[i],
                number: accountId[i],
                start: start_amount[i],
                change: change_amount[i],
                end: end_amount[i],
              };
              output.push(obj.i);
            }
            res.status(200).json(output);
          }
        });
      } else {
        res.status(401).json({ message: 'User not logged in' });
      }
    });

  statementRouter.route('/statement')
    .get((req, res) => {
      if (req.user) {
        db.query('SELECT * FROM details_table, transaction_table, account_table '
          + 'WHERE at_user_id = dt_userID AND at_account_id = dt_accountID '
          + 'AND tt_user_id = dt_userID AND tt_transaction_id = dt_transactionID AND dt_userID = ? '
          + 'AND account_type = ? ORDER BY dt_accountID, tt_date ASC, dt_transactionID;',
        [req.user.username, 'Income'],
        (err, results) => {
          const end_amount = [];
          const accountId = [];
          const accountName = [];
          if (err) {
            debug(err);
            res.status(500).json({ message: 'An error has occurred when getting data from database' });
          } else {
            let start = 0;
            for (let i = 0; i < results.length; i += 1) {
              let end = 0;
              accountId.push(results[i].dt_accountID);
              accountName.push(results[i].at_account_name);
              // credit not null for first transaction
              if (results[i].dt_credit) {
                end -= results[i].dt_credit;
                start = -results[i].dt_credit;
              }
              // debit not null for first transaction
              else if (results[i].dt_debit) {
                end += results[i].dt_debit;
                start = results[i].dt_debit;
              }
              if (i === results.length - 1) {
                if (end < 0) {end_amount.push(math.abs(end));}
                else {end_amount.push(end);}
                break;
              }
              // loop through same account_id
              while (results[i].dt_accountID === results[i + 1].dt_accountID) {
                if (results[i + 1].dt_credit) {end -= results[i + 1].dt_credit;}
                else if (results[i + 1].dt_debit) {end += results[i + 1].dt_debit;}
                i++;
                if (i >= results.length - 1) {break;}
              }
              // push the end amount for each account
              if (end < 0) {
                end_amount.push(math.abs(end));
              } else {
                end_amount.push(end);
              }
            }
            // deal with return object
            const obj = {};
            const output = [];
            for (let i = 0; i < accountId.length; i += 1) {
              obj.i = {
                account: accountName[i],
                number: accountId[i],
                change: end_amount[i],
              };
              output.push(obj.i);
            }
            res.status(200).json(output);
          }
        });
      } else {
        res.status(401).json({ message: 'User not logged in' });
      }
    });

  return statementRouter;
};
