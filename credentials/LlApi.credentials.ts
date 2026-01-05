import type {
  IAuthenticateGeneric,
  ICredentialTestRequest,
  ICredentialType,
  INodeProperties,
} from 'n8n-workflow';

export class LlApi implements ICredentialType {
  name = 'llApi';
  displayName = 'LL API (Bearer)';
  documentationUrl = 'https://seu-docs-ou-repo';

  properties: INodeProperties[] = [
    {
      displayName: 'Base URL',
      name: 'baseUrl',
      type: 'string',
      default: 'http://localhost:3001',
      required: true,
    },
    {
      displayName: 'Token',
      name: 'token',
      type: 'string',
      typeOptions: { password: true },
      default: '',
      required: true,
    },
  ];

  authenticate: IAuthenticateGeneric = {
    type: 'generic',
    properties: {
      headers: {
        Authorization: '=Bearer {{$credentials.token}}',
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
