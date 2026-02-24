package dashboard

import (
	"embed"
	"io/fs"
	"net/http"
)

//go:embed ui/dist/*
var staticFiles embed.FS

// getStaticFS returns a sub filesystem containing only the dist contents
func getStaticFS() http.FileSystem {
	sub, err := fs.Sub(staticFiles, "ui/dist")
	if err != nil {
		panic(err)
	}
	return http.FS(sub)
}
