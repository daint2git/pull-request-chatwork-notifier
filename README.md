# "Pull Request Chatwork Notifier" JavaScript Action

[![ci](https://github.com/daint2git/pull-request-chatwork-notifier/workflows/ci/badge.svg)](https://github.com/daint2git/pull-request-chatwork-notifier/actions?query=workflow:ci)

Send a message to the chatwork when a pull request is `created`, `merged` or `closed`.

## Inputs

### `chatwork-api-token`

**Required**

Chatwork API token.

### `chatwork-room-id`

**Required**

Chatwork room ID, where the message was sent.

### `mapping`

**Required**

Mapping between github username and chatwork user ID.

### `extra-message-body`

Extra message content will be added below the main message content.

## Outputs

### `chatwork-message-id`

Chatwork message ID generated by chatwork server.

## Example workflow

```yml
name: example

on:
  pull_request:
    types:
      - opened
      - closed

jobs:
  notify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: ./
        with:
          chatwork-api-token: ${{ secrets.CHATWORK_API_TOKEN }}
          chatwork-room-id: ${{ secrets.CHATWORK_ROOM_ID }}
          mapping: |
            {
              "git_user01": 123,
              "git_user02": 456
            }
```

## License

This Action is distributed under the terms of the MIT license, see [LICENSE](./LICENSE) for details.
