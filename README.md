# gofer+srv

A playground for SRV record support in an http client.

## Usage

1. Set up a local nameserver that forwards `.local` to Bonjour
2. Register some service, e.g. `my-service._http._tcp.local.`
3. Call HTTP APIs via `node lib/gofer.js 'http+srv://my-service/some/path'`
