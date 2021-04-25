import * as core from '@actions/core';
import * as github from '@actions/github';

type InputKey = 'chatwork-api-token' | 'chatwork-room-id' | 'chatwork-user-ids';

type Input = {
  token: string;
  roomID: number;
  userIDs: number[];
};

function getInputRequired(key: InputKey): string {
  const value = core.getInput(key);

  if (!value) {
    throw new Error(`${key} is required.`);
  }

  return value;
}

function parseInput(): Input {
  const token = getInputRequired('chatwork-api-token');
  const roomID = +getInputRequired('chatwork-room-id');
  const userIDs = getInputRequired('chatwork-user-ids')
    .split(',')
    .map(id => +id.trim())
    .filter(Boolean);

  if (roomID) {
    throw new Error('"chatwork-room-id" must be a number.');
  }

  if (userIDs.length === 0) {
    throw new Error('"chatwork-user-ids" must be an array of numbers.');
  }

  return {
    token,
    roomID: roomID,
    userIDs,
  };
}

async function main() {
  try {
    const input = parseInput();
  } catch (error) {
    core.setFailed(error.message);
  }
}

main();
