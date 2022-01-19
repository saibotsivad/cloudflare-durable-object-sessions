# `[DEMO]` cloudflare-durable-object-sessions

Demo of Cloudflare Workers and Durable Objects as an approach to user and session management.

This was just me, trying to understand how Durable Objects work, and how I might use them for authentication and session management.

Docs of interest:

- Learning the basics: https://developers.cloudflare.com/workers/learning/using-durable-objects
- The runtime APIs: https://developers.cloudflare.com/workers/runtime-apis/durable-objects
- Using the CF API: https://api.cloudflare.com/#durable-objects-namespace-list-objects

## Deploy notes

You can run this yourself, if you want. Make sure to change the `routes` in the `wrangler.toml` file,
and everything else should work.

At the end, to delete the whole stack you'll need to run a Wrangler migration to delete the
Durable Object class (see the `wrangler.toml` file for notes), and then you can go into
the Worker page (in the Cloudflare dashboard), into "Manage Services", and there
delete all the stuff created here.

## License

Published and released under the [Very Open License](http://veryopenlicense.com).
