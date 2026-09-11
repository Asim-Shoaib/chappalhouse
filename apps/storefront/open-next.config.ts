import { defineCloudflareConfig } from '@opennextjs/cloudflare'

// Defaults throughout. The overrides this file exists for — R2 incremental
// cache, Durable Object queues, sharded tag cache — are for sites big enough
// to need cache sharding. Adding them here would mean paid bindings and more
// moving parts for a 33-product catalog that is almost entirely prerendered.
export default defineCloudflareConfig()
