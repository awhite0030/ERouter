Add a `erouter.yaml`, point it at a public JSON API, run `npm run dev`,
and the gateway is live on `http://127.0.0.1:8080`.

Minimal example:

```yaml
server:
  host: 127.0.0.1
  port: 8080
routes:
  - id: jsonplaceholder-post
    match:
      path: /demo/posts/:id
    upstream:
      url: https://jsonplaceholder.typicode.com/posts/{id}
resources:
  pool:
    dir: ./data/pool
```
