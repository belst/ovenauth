# OvenMediaEngine webhook server

This is super simple and not fully featured at all.

It lets only registered users ingest streams.

Login and logout are useless for now.

### Configuration

It uses the following env variables to configure the server.
You can store the configuration in a .env aswell

```bash
DATABASE_URL="postgres://user:password@host:port/dbname" # Database connection, only pg supported for now
HOST="localhost" # Host to listen on
PORT=8080 # Port to listen on
SECRET_CODE="meme" # Code u need to provide as `secret_code` in your register POST
```

