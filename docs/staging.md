# Staging: `agrocer-stg01`

Stage 1 staging runs Agrocer as a single container on the second Lenovo ThinkCentre
Proxmox node (ADR-008). It must stay up when the Ryzen desktop is off (ADR-007).

## VM

| | |
| --- | --- |
| Name | `agrocer-stg01` |
| OS | Ubuntu Server 24.04 LTS |
| vCPU | 2 |
| RAM | 3 GB |
| Disk | 60 GB |
| Network | Server/Dev VLAN, static lease |

Give it a static DHCP reservation before you start — the phone bookmark and, later,
the reverse proxy both depend on the address not moving.

## First-time setup on the VM

```bash
# Docker Engine from Docker's own repo (Ubuntu's packaged version lags).
sudo apt-get update
sudo apt-get install -y ca-certificates curl git
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] \
  https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Run docker without sudo. Log out and back in for this to take effect.
sudo usermod -aG docker "$USER"
```

## Deploy

```bash
git clone https://github.com/Ashnetnase/aGrocer.git ~/agrocer
cd ~/agrocer
docker compose up -d --build
```

Updating to a newer commit:

```bash
cd ~/agrocer
git pull
docker compose up -d --build
docker image prune -f     # drop the superseded image
```

## Verify

```bash
docker compose ps                 # state should be "running (healthy)"
docker compose logs -f agrocer    # Ctrl-C to detach
curl -f http://localhost:3000/    # 200 from the VM itself
```

From a phone on the same network, open `http://<vm-address>:3000`.

## Installing on a phone

The service worker and the install prompt both require a secure context. `localhost`
counts as secure; a bare LAN address over plain HTTP does not — so over `http://<vm-address>:3000`
the app will run and store data, but **it will not offer to install and the service worker
will not register**.

To get the installable PWA, put it behind HTTPS. Options, cheapest first:

1. **Tailscale** on the VM and the phones — gives every device a stable name, and
   Tailscale HTTPS certificates make the origin secure with no public exposure.
2. **Caddy** in front of Agrocer with a certificate from an internal ACME/CA, trusted
   on the family's devices.
3. A real domain with DNS-01 Let's Encrypt, if you ever want access from outside the house.

Tailscale is the least work and keeps Agrocer off the public internet. Worth deciding
before the Stage 1 acceptance review, since "install/use the PWA foundation" is a
Definition of Done item.

## Notes

- Stage 1 stores everything in each browser's localStorage. There is no shared state
  between devices and nothing on the server to back up — two phones will show two
  different lists. Shared household data is Stage 2 work.
- No secrets are needed by this deployment. Do not add an `.env` to the repo when
  that changes; use compose environment values or a secrets file kept off git.
