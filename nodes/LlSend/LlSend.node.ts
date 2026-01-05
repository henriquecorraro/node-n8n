import type {
  IExecuteFunctions,
  IHttpRequestMethods,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
} from 'n8n-workflow';

export class LlSend implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'LL Integrations',
    name: 'llSend',
    group: ['output'],
    version: 1,
    description: 'Send a request to LL API',
    defaults: {
      name: 'LL Integrations',
    },
     icon: 'file:logo.svg',
    inputs: ['main'],
    outputs: ['main'],
    credentials: [{ name: 'llApi', required: true }],
    properties: [
      {
        displayName: 'Endpoint',
        name: 'endpoint',
        type: 'string',
        default: '/webhooks/receive',
        required: true,
        description: 'Path appended to Base URL',
      },
      {
        displayName: 'Method',
        name: 'method',
        type: 'options',
        default: 'POST',
        options: [
          { name: 'POST', value: 'POST' },
          { name: 'PUT', value: 'PUT' },
          { name: 'PATCH', value: 'PATCH' },
        ],
      },
      {
        displayName: 'Send Item JSON as Body',
        name: 'sendItemJson',
        type: 'boolean',
        default: true,
      },
      {
        displayName: 'Body (JSON)',
        name: 'body',
        type: 'json',
        default: '{}',
        displayOptions: { show: { sendItemJson: [false] } },
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const creds = await this.getCredentials('llApi');
    const baseUrl = String(creds.baseUrl).replace(/\/$/, '');

    const returnData: INodeExecutionData[] = [];

    for (let i = 0; i < items.length; i++) {
      const endpoint = this.getNodeParameter('endpoint', i) as string;
      const method = this.getNodeParameter('method', i) as IHttpRequestMethods;
      const sendItemJson = this.getNodeParameter('sendItemJson', i) as boolean;

      const body = sendItemJson ? items[i].json : (this.getNodeParameter('body', i) as object);

      const url = `${baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

      const response = await this.helpers.requestWithAuthentication.call(this, 'llApi', {
        method,
        url,
        json: true,
        body,
      });

      returnData.push({ json: response });
    }

    return [returnData];
  }
}
