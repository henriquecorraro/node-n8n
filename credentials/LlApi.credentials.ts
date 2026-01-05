import type {
  IAuthenticateGeneric,
  ICredentialTestRequest,
  ICredentialType,
  INodeProperties,
} from 'n8n-workflow';

export class LlApi implements ICredentialType {
  name = 'llApi';
  displayName = 'LL API';
  documentationUrl = 'https://seus-docs-ou-repo';

   properties: INodeProperties[] = [
    {
      displayName: 'Base URL',
      name: 'baseUrl',
      type: 'string',
      default: 'https://api.liguelead.com.br',
      required: true,
    },
    {
      displayName: 'API Token',
      name: 'apiToken',
      type: 'string',
      typeOptions: { password: true },
      required: true,
      default: '',
    },
    {
      displayName: 'App ID',
      name: 'appId',
      type: 'string',
      required: true,
      default: '',
    },
  ];

  authenticate: IAuthenticateGeneric = {
    type: 'generic',
    properties: {
      headers: {
        'api-token': '={{$credentials.apiToken}}',
        'app-id': '={{$credentials.appId}}',
      },
    },
  };

  test: ICredentialTestRequest = {
    request: {
      method: 'GET',
      url: '={{$credentials.baseUrl}}/health',
    },
  };
}
