audica radio
============

A stream player/recorder with a Textstar Serial LCD and REST UI. Developed to use a raspberrypi as a standalone streaming radio.
VLC is needed for playing. Streamripper is needed for recording.

### REST UI

        http://raspberripi:3141/add?url=<url>[&name=<name>] ... Add a radio station and optional a name for it
        http://raspberripi:3141/next         ... Switch to the next radio station
        http://raspberripi:3141/prev         ... Switch to the previous radio station
        http://raspberripi:3141/play         ... Start playing the current radio station
        http://raspberripi:3141/stop         ... Stop playing the current radio station
        http://raspberripi:3141/record       ... Start recording the current radio station
        http://raspberripi:3141/recordStop   ... Stop recording the current radio station

### LCD UI

        Key A (upper left)            ... Switch to the previous radio station
        Key C (upper right)           ... Switch to the next radio station
        Key B short <1s (bottom left) ... Start/Stop playing the current radio station
        Key B long >1s (bottom left)  ... Start/Stop recording the current radio station
        Key D (bottom right)          ... Show ip's of eth0 and/or wlan0 if available
