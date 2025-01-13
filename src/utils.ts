import { Chat, Message } from "whatsapp-web.js"

import { Client } from "whatsapp-web.js"
import { Response } from 'express';

const axios = require('axios')
const { globalApiKey, disabledCallbacks } = require('./config')

// Trigger webhook endpoint
const triggerWebhook = (webhookURL: string, sessionId: string, dataType: string, data: any) => {
  axios.post(webhookURL, { dataType, data, sessionId }, { headers: { 'x-api-key': globalApiKey } })
    .catch((error: { message: any }) => console.error('Failed to send new message webhook:', sessionId, dataType, error.message, data || ''));
}

// Function to send a response with error status and message

const sendErrorResponse = (res: Response, status: number, message: unknown) => {
  res.status(status).json({ success: false, error: message })
}

// Function to wait for a specific item not to be null
const waitForNestedObject = (rootObj: Client | undefined, nestedPath: string, maxWaitTime = 60000, interval = 100) => {
  const start = Date.now()
  return new Promise<void>((resolve, reject) => {
    const checkObject = () => {
      const nestedObj = nestedPath.split('.').reduce((obj: { [x: string]: any }, key: string | number) => obj ? obj[key] : undefined, rootObj || {})
      if (nestedObj) {
        // Nested object exists, resolve the promise
        console.log('Nested object found:', nestedPath);
        resolve()
      } else if (Date.now() - start > maxWaitTime) {
        // Maximum wait time exceeded, reject the promise
        console.log('Timed out waiting for nested object:', nestedPath);
        reject(new Error('Timeout waiting for nested object'))
      } else {
        // Nested object not yet created, continue waiting
        console.log('Waiting for nested object:', nestedPath);
        setTimeout(checkObject, interval)
      }
    }
    checkObject()
  })
}

const checkIfEventisEnabled = (event: string) => {
  return new Promise<void>((resolve, reject) => { if (!disabledCallbacks.includes(event)) { resolve() } })
}
export {
  triggerWebhook,
  sendErrorResponse,
  waitForNestedObject,
  checkIfEventisEnabled,
};
