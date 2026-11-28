# One image: .NET serves the API (under /api) and the built React app from the same origin.

FROM node:20-alpine AS web
WORKDIR /src
COPY client/package.json client/package-lock.json ./
RUN npm ci
COPY client/ ./
# client/.env sets INLINE_RUNTIME_CHUNK=false, which the CSP's script-src 'self' needs.
RUN npm run build

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS api
WORKDIR /src
COPY server/Server.csproj server/
RUN dotnet restore server/Server.csproj
COPY server/ server/
RUN dotnet publish server/Server.csproj -c Release -o /app --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=api /app ./
COPY --from=web /src/build ./wwwroot
ENV ASPNETCORE_HTTP_PORTS=8080
EXPOSE 8080
# Run as the image's built-in non-root user.
USER $APP_UID
ENTRYPOINT ["dotnet", "Server.dll"]
