import * as core from '@actions/core';
import * as github from '@actions/github';
import * as querystring from 'querystring';
import * as https from 'https';
import * as http from 'http';

type Input = {
  token: string;
  roomId: number;
  mapping: Record<string, number>;
  extraMessageBody: string;
};

function formatMapping(mapping: string): Record<string, number> {
  try {
    const data = JSON.parse(mapping) as Record<string, string>;
    return Object.keys(data).reduce((r, k) => {
      const value = +data[k];
      return value ? { ...r, [k]: value } : r;
    }, {});
  } catch {
    throw new Error('"mapping" must be an object.');
  }
}

function getChatworkUser(githubUsername: string, mapping: Input['mapping']) {
  return mapping[githubUsername]
    ? `[To:${mapping[githubUsername]}]${githubUsername}`
    : githubUsername;
}

function parseInput(): Input {
  const token = core.getInput('chatwork-api-token', { required: true });
  const roomId = +core.getInput('chatwork-room-id', { required: true });
  const mapping = formatMapping(core.getInput('mapping', { required: true }));
  const extraMessageBody = core.getInput('extra-message-body');

  console.log('token', token + '111');
  console.log('roomId', roomId + '1234');
  console.log('mapping', mapping);

  if (roomId) {
    throw new Error('"chatwork-room-id" must be a number.');
  }

  if (Object.keys(mapping).length > 0) {
    throw new Error('"mapping" must be an object with at least one key.');
  }

  return {
    token,
    roomId,
    mapping,
    extraMessageBody,
  };
}

function createMessage({
  mapping,
  extraMessageBody,
}: Pick<Input, 'mapping' | 'extraMessageBody'>) {
  const { pull_request, action } = github.context.payload;
  const title = pull_request?.title ?? '<Empty title>';
  const url = pull_request?.html_url ?? '<Empty URL>';
  const pullNumber = pull_request?.number;
  const toChatworkUsers = Object.keys(mapping)
    .map(githubUsername => `[To:${mapping[githubUsername]}]${githubUsername}`)
    .join('\n');
  const createdBy = getChatworkUser(pull_request?.user.login, mapping);

  if (action === 'opened') {
    return `${toChatworkUsers}
[info]
[title]Pull request #${pullNumber} is OPENED[/title]
Title: ${title}
URL: ${url}
Created by: ${createdBy}
${
  extraMessageBody
    ? `[hr]
${extraMessageBody}`
    : ''
}
[/info]
`;
  }

  if (action === 'closed') {
    // pull request merged
    if (pull_request?.merged) {
      const mergedBy = getChatworkUser(pull_request?.merged_by.login, mapping);

      return `${toChatworkUsers}
[info]
[title]Pull request #${pullNumber} is MERGED[/title]
Title: ${title}
URL: ${url}
Created by: ${createdBy}
Merged by: ${mergedBy}
${
  extraMessageBody
    ? `[hr]
${extraMessageBody}`
    : ''
}
[/info]
`;
    }

    return `${toChatworkUsers}
[info]
[title]Pull request #${pullNumber} is CLOSED[/title]
Title: ${title}
URL: ${url}
Created by: ${createdBy}
${
  extraMessageBody
    ? `[hr]
${extraMessageBody}`
    : ''
}
[/info]
`;
  }

  return '<Empty message body>';
}

function sendMessage({
  token,
  roomId,
  message,
}: Pick<Input, 'token' | 'roomId'> & { message: string }) {
  return new Promise<Readonly<{ message_id: string }>>((resolve, reject) => {
    const options: https.RequestOptions = {
      hostname: 'api.chatwork.com',
      port: 443,
      path: `/v2/rooms/${roomId}/messages`,
      method: 'POST',
      headers: {
        'X-ChatWorkToken': token,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    };

    const callback = (response: http.IncomingMessage) => {
      if (response.statusCode !== 200) {
        reject(
          new Error(`Request failed with status code ${response.statusCode}`),
        );
      }

      let body = '';

      response.setEncoding('utf8');
      response.on('data', chunk => (body += chunk));
      response.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (error) {
          reject(error);
        }
      });
    };

    const request = https.request(options, callback);

    request.on('error', reject);
    request.write(`body=${querystring.escape(message)}`, error => {
      if (error) reject(error);
    });
    request.end();
  });
}

function isPullRequestEvent() {
  return github.context.eventName === 'pull_request';
}

async function main() {
  if (!isPullRequestEvent()) {
    core.debug('Skipped event');
    return;
  }

  try {
    const input = parseInput();
    core.debug(`input: ${input}`);

    const message = createMessage({
      mapping: input.mapping,
      extraMessageBody: input.extraMessageBody,
    });
    core.debug(`message: ${message}`);

    const response = await sendMessage({
      token: input.token,
      roomId: input.roomId,
      message,
    });
    core.debug(`response: ${response}`);

    core.setOutput('chatwork-message-id', response.message_id);
  } catch (error) {
    core.setFailed(error.message);
  }
}

main();
