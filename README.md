# Streams Download Contract

A public, provider-independent download format maintained by **Craftynor Studio**.

Websites download a file named `config.streams.json` using an ordinary HTTPS link or a generated Blob with an HTML `download` filename. Compatible apps download the manifest as the first stage of a persistent job, validate it, download its resources, execute the declared operations, and save the final file. The manifest and temporary inputs are internal job files.

Apps should show one progress item from manifest transfer through the final save, with stage labels, aggregate resource bytes, transfer speed and remaining time where measurable. Unknown totals and unmeasurable processing use indeterminate progress. Completion means the final output has been committed, not merely that its inputs finished downloading.

## Version 1

[JSON Schema](v1/schema.json) · [Direct download](examples/direct.streams.json) · [Audio/video mux](examples/mux.streams.json) · [Ordered merge](examples/merge.streams.json)

The media examples use placeholder resource URLs. [This document example](examples/document.streams.json) downloads the actual public specification and demonstrates a complete direct-file job.

```json
{
  "format": "streams-download",
  "version": 1,
  "metadata": { "title": "Example", "durationMs": 120000 },
  "streams": [
    { "id": "video", "url": "https://media.example/video.mp4", "role": "video", "mimeType": "video/mp4" },
    { "id": "audio", "url": "https://media.example/audio.m4a", "role": "audio", "mimeType": "audio/mp4" }
  ],
  "operations": [{ "id": "final", "type": "mux", "inputs": ["video", "audio"], "container": "mp4" }],
  "output": { "source": "final", "filename": "Example.mp4", "mimeType": "video/mp4" }
}
```

## Execution rules

- IDs are unique across streams and operations. Operations are ordered: each input must reference a stream or an earlier operation. `output.source` references the final result. Cycles, dangling references, duplicate inputs and unused resources/operations are invalid.
- `mux` consumes exactly one video and one audio result and writes an MP4 or WebM container without re-encoding. Providers choose codecs supported by the destination container and app. `merge` preserves input order. `mode: "bytes"` joins fragments explicitly intended for binary assembly; `mode: "media"` concatenates independently playable media with matching track formats into the declared container.
- A direct download has no operations. `output.source` points at a stream. Segment assembly followed by mux is expressed as ordered merge operations feeding a mux operation.
- URLs use HTTPS without embedded credentials and must resolve to public addresses. Apps enforce these rules on every redirect. Filenames are a single basename; apps sanitize them and choose the storage directory. Manifests contain data, never executable commands, scripts or filesystem paths.
- A manifest is at most 512 KiB. Version 1 allows up to 256 streams and 64 operations. Apps reject unsupported versions/operations before downloading media.
- Headers belong to an individual resource or refresh request. Header names and values must be valid HTTP fields. Cookie, Host, Origin, Referer, proxy, connection-control and `Sec-*` headers are forbidden. Authorization is supported but removed on cross-origin redirects. Apps never automatically share browser cookies.
- `sizeBytes` is an optional expectation, not a substitute for server response lengths. A mismatch fails validation. `sha256`, if present, must match the downloaded resource. `expiresAt` is Unix time in seconds.
- Optional `refresh.url` returns a replacement manifest on HTTPS GET. An app may retry it once for expired URLs or HTTP 401/403/410. It must preserve version, metadata, stream IDs/roles/MIME types/sizes/checksums, operations and output; only resource URLs, headers and expiry may change. Providers without a refresh service can ask users to generate a new manifest. Refresh is not a mechanism for executing website code.
- Optional `page` is the HTTPS address of the website page that created the manifest, with the same choices. When resource links expire and no refresh succeeds, an app can offer to open this page so the user can start the download again. Apps open it as an ordinary page; it is never fetched as a manifest.
- Apps can apply lower limits or support fewer containers. Websites should document their requirements. A regular browser saves the JSON file; automatic processing requires a compatible app.

## Website download

```js
const blob = new Blob([JSON.stringify(manifest)], { type: "application/vnd.streams-download+json" });
const href = URL.createObjectURL(blob);
const link = document.createElement("a");
link.href = href;
link.download = "config.streams.json";
document.body.append(link);
link.click();
link.remove();
// Keep the URL alive while the browser reads the generated file.
setTimeout(() => URL.revokeObjectURL(href), 60000);
```

Use `Content-Disposition: attachment; filename="config.streams.json"` and the same MIME type for an HTTPS-hosted manifest. Consumers recognize the `.streams.json` suffix or this MIME type and still validate the actual contents.

MIT License. Maintained by Craftynor Studio.
