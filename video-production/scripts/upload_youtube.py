import argparse
from pathlib import Path

from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload


SCOPES = ["https://www.googleapis.com/auth/youtube.upload"]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Upload simples de video para YouTube.")
    parser.add_argument("--file", required=True, help="Caminho do video a enviar.")
    parser.add_argument("--title", required=True, help="Titulo do video.")
    parser.add_argument("--description", required=True, help="Descricao do video.")
    parser.add_argument("--tags", default="", help="Tags separadas por virgula.")
    parser.add_argument(
        "--privacy",
        default="unlisted",
        choices=["private", "public", "unlisted"],
        help="Visibilidade do video.",
    )
    parser.add_argument(
        "--category-id",
        default="27",
        help="Categoria do YouTube. Ex.: 27 para Education.",
    )
    parser.add_argument(
        "--client-secret",
        default="client_secret.json",
        help="Arquivo OAuth baixado no Google Cloud.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    video_path = Path(args.file)
    client_secret = Path(args.client_secret)

    if not video_path.exists():
        raise FileNotFoundError(f"Video nao encontrado: {video_path}")

    if not client_secret.exists():
        raise FileNotFoundError(f"Client secret nao encontrado: {client_secret}")

    flow = InstalledAppFlow.from_client_secrets_file(str(client_secret), SCOPES)
    credentials = flow.run_local_server(port=0)

    youtube = build("youtube", "v3", credentials=credentials)
    tags = [tag.strip() for tag in args.tags.split(",") if tag.strip()]

    request = youtube.videos().insert(
        part="snippet,status",
        body={
            "snippet": {
                "title": args.title,
                "description": args.description,
                "tags": tags,
                "categoryId": args.category_id,
            },
            "status": {
                "privacyStatus": args.privacy,
            },
        },
        media_body=MediaFileUpload(str(video_path), chunksize=-1, resumable=True),
    )

    response = request.execute()
    print(f"Upload concluido. Video ID: {response['id']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
