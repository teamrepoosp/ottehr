import { APIGatewayProxyResult } from 'aws-lambda';
import { getSecret, SecretsKeys } from 'utils';
import { topLevelCatch, wrapHandler, ZambdaInput } from '../../../shared';

let m2mToken: string;

const ZAMBDA_NAME = 'sub-update-invoice-task';

export const index = wrapHandler(ZAMBDA_NAME, async (input: ZambdaInput): Promise<APIGatewayProxyResult> => {
  try {
    // const validatedParams = validateRequestParameters(input);
    m2mToken = '';
    console.log(m2mToken);

    // m2mToken = await checkOrCreateM2MClientToken(m2mToken, secrets);
    // const oystehr = createOystehrClient(m2mToken, secrets);
    // const stripe = getStripeClient(secrets);
    // const candid = createCandidApiClient(secrets);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Invoice created and sent successfully' }),
    };
  } catch (error: unknown) {
    const ENVIRONMENT = getSecret(SecretsKeys.ENVIRONMENT, input.secrets);
    console.log('Error occurred:', error);
    return await topLevelCatch(ZAMBDA_NAME, error, ENVIRONMENT);
  }
});
