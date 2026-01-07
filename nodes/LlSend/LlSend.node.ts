import type {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
} from 'n8n-workflow';

type Operation = 'sendSms' | 'sendVoice' | 'sendVoiceWithUpload';

export class LlSend implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'LL Integrations',
    name: 'llSend',
    group: ['output'],
    version: 3,
    description: 'Send SMS, Voice or Upload audio + send voice using LL API',
    defaults: { name: 'LL Integrations' },
    icon: 'file:logo.svg',
    inputs: ['main'],
    outputs: ['main'],
    credentials: [{ name: 'llApi', required: true }],
    properties: [
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        default: 'sendSms',
        options: [
          { name: 'Enviar SMS', value: 'sendSms' },
          { name: 'Enviar Ligação', value: 'sendVoice' },
          { name: 'Enviar Ligação subindo áudio', value: 'sendVoiceWithUpload' },
        ],
      },

      // -------- SMS (JSON) --------
      {
        displayName: 'Send Input JSON as Body',
        name: 'sendInputJson',
        type: 'boolean',
        default: true,
        displayOptions: { show: { operation: ['sendSms'] } },
        description: 'If enabled, sends the incoming item JSON as the request body.',
      },
      {
        displayName: 'Body (Override)',
        name: 'bodyOverride',
        type: 'json',
        default: '',
        displayOptions: {
          show: { operation: ['sendSms'], sendInputJson: [false] },
        },
      },

      // -------- Voice (JSON) --------
      {
        displayName: 'Voice Upload ID',
        name: 'voiceUploadId',
        type: 'number',
        default: 0,
        required: true,
        displayOptions: { show: { operation: ['sendVoice'] } },
        description: 'ID do áudio previamente enviado (voice_upload_id).',
      },
      {
        displayName: 'Phones Field',
        name: 'phonesField',
        type: 'string',
        default: 'phones',
        required: true,
        displayOptions: { show: { operation: ['sendVoice', 'sendVoiceWithUpload'] } },
        description:
          'Nome do campo no input JSON que contém o array de telefones. Ex: "phones".',
      },
      {
        displayName: 'Title Field',
        name: 'titleField',
        type: 'string',
        default: 'title',
        required: true,
        displayOptions: { show: { operation: ['sendVoice', 'sendVoiceWithUpload'] } },
        description: 'Nome do campo no input JSON que contém o title. Ex: "title".',
      },

      // -------- Voice with Upload (multipart + JSON) --------
      {
        displayName: 'Binary Property',
        name: 'binaryPropertyName',
        type: 'string',
        default: 'data',
        required: true,
        displayOptions: { show: { operation: ['sendVoiceWithUpload'] } },
        description:
          'Nome da propriedade binary que contém o arquivo de áudio (ex: "data"). Use Read Binary File antes.',
      },
      {
        displayName: 'Upload Title (optional)',
        name: 'uploadTitle',
        type: 'string',
        default: '',
        displayOptions: { show: { operation: ['sendVoiceWithUpload'] } },
        description:
          'Se vazio, o node usa o valor do Title Field como title do upload.',
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const creds = await this.getCredentials('llApi');

    // Se você travou base URL no credential, pode manter.
    // Se removeu baseUrl, pode setar fixo aqui:
    const baseUrl = String((creds as any).baseUrl ?? 'https://api.liguelead.com.br').replace(/\/$/, '');

    const returnData: INodeExecutionData[] = [];

    for (let i = 0; i < items.length; i++) {
      const operation = this.getNodeParameter('operation', i) as Operation;

      // -------------------------
      // 1) ENVIAR SMS
      // -------------------------
      if (operation === 'sendSms') {
        const url = `${baseUrl}/v1/sms`;
        const sendInputJson = this.getNodeParameter('sendInputJson', i) as boolean;

        const body =
          sendInputJson ? items[i].json : (this.getNodeParameter('bodyOverride', i) as object);

        if (!body || (typeof body === 'object' && Object.keys(body as any).length === 0)) {
          throw new Error(
            'Request body is empty. Use "Edit Fields" to create the payload or provide a Body Override.'
          );
        }

        const response = await this.helpers.requestWithAuthentication.call(this, 'llApi', {
          method: 'POST',
          url,
          json: true,
          body,
        });

        returnData.push({ json: { ok: true, operation, request: { url, body }, response } });
        continue;
      }

      // Campos comuns das operações de voz
      const phonesField = this.getNodeParameter('phonesField', i) as string;
      const titleField = this.getNodeParameter('titleField', i) as string;

      const phones = (items[i].json as any)?.[phonesField];
      const title = (items[i].json as any)?.[titleField];

      if (!Array.isArray(phones) || phones.length === 0) {
        throw new Error(
          `Campo "${phonesField}" precisa ser um array de telefones (phones: string[]).`
        );
      }
      if (typeof title !== 'string' || !title.trim()) {
        throw new Error(`Campo "${titleField}" precisa ser uma string (title).`);
      }

      // -------------------------
      // 2) ENVIAR LIGAÇÃO (voice_upload_id informado)
      // -------------------------
      if (operation === 'sendVoice') {
        const voiceUploadId = this.getNodeParameter('voiceUploadId', i) as number;
        if (!voiceUploadId || Number.isNaN(voiceUploadId)) {
          throw new Error('Informe um Voice Upload ID válido.');
        }

        const url = `${baseUrl}/v1/voice`;

        const body = {
          title,
          voice_upload_id: voiceUploadId,
          phones,
        };

        const response = await this.helpers.requestWithAuthentication.call(this, 'llApi', {
          method: 'POST',
          url,
          json: true,
          body,
        });

        returnData.push({
          json: { ok: true, operation, request: { url, body }, response },
        });
        continue;
      }

      // -------------------------
      // 3) ENVIAR LIGAÇÃO SUBINDO ÁUDIO (upload + send)
      // -------------------------
      if (operation === 'sendVoiceWithUpload') {
        const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i) as string;
        const uploadTitleParam = this.getNodeParameter('uploadTitle', i) as string;

        const bin = items[i].binary?.[binaryPropertyName];
        if (!bin) {
          throw new Error(
            `Binary property "${binaryPropertyName}" não encontrado. Use "Read Binary File" antes e garanta que o arquivo está em binary.${binaryPropertyName}.`
          );
        }

        // 3.1) upload
        const uploadUrl = `${baseUrl}/v1/voice/uploads`;

        const uploadTitle = (uploadTitleParam?.trim() ? uploadTitleParam : title).trim();

        const uploadRequest: any = {
          method: 'POST',
          url: uploadUrl,
          formData: {
            title: uploadTitle,
            file: {
              value: bin,
              options: {
                filename: bin.fileName ?? 'audio',
                contentType: bin.mimeType ?? 'application/octet-stream',
              },
            },
          },
          json: true,
        };

        const uploadResponse = await this.helpers.requestWithAuthentication.call(
          this,
          'llApi',
          uploadRequest
        );

        const voiceUploadId = (uploadResponse as any)?.data?.id;
        if (!voiceUploadId) {
          throw new Error(
            `Upload retornou sucesso mas não veio "data.id". Resposta: ${JSON.stringify(
              uploadResponse
            )}`
          );
        }

        // 3.2) send voice usando id retornado
        const voiceUrl = `${baseUrl}/v1/voice`;

        const body = {
          title, // title do envio
          voice_upload_id: voiceUploadId,
          phones,
        };

        const voiceResponse = await this.helpers.requestWithAuthentication.call(this, 'llApi', {
          method: 'POST',
          url: voiceUrl,
          json: true,
          body,
        });

        returnData.push({
          json: {
            ok: true,
            operation,
            upload: { url: uploadUrl, title: uploadTitle, response: uploadResponse },
            send: { url: voiceUrl, body, response: voiceResponse },
          },
        });

        continue;
      }
    }

    return [returnData];
  }
}
