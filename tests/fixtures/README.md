`clip-source.mp4` is a synthetic 8-second 64×48 test video with H.264
B-frames, keyframes every 2 seconds, and an AAC sine-wave audio track.
It verifies packet copying, GOP boundaries, concatenation, and audio removal.
Tests use the checked-in file and do not require FFmpeg.

Fixture generation:

```sh
ffmpeg -f lavfi -i testsrc2=size=64x48:rate=12 -f lavfi -i sine=frequency=440 -t 8 -c:v libx264 -g 24 -keyint_min 24 -sc_threshold 0 -bf 2 -pix_fmt yuv420p -c:a aac -b:a 16k clip-source.mp4
```
