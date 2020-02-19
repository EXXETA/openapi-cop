# OpenAPI Backend Mock API

Mock API based on [openapi-backend](https://github.com/anttiviljami/openapi-backend) example.

## QuickStart

```bash
npm install
npm run dev # API running at //localhost:8889
```

Try the endpoints:

```bash
curl -i http://localhost:8889/pets
curl -i http://localhost:8889/pets/1
curl -i -X POST -d {} http://localhost:8889/pets

curl -i -X POST -d '{"data": "sent"}' -H "Content-Type:application/json" http://localhost:8889/pets
```
