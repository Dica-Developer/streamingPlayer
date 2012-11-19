audica radio
============

A stream player with a Textstar Serial LCD and REST UI. Developed to use a raspberrypi as a standalone streaming radio.

### REST UI

        http://raspberripi:3141/add?url=<url>[&name=<name>] ... Switch to the next radio station
        http://raspberripi:3141/next ... Switch to the next radio station
        http://raspberripi:3141/prev ... Switch to the previous radio station
        http://raspberripi:3141/play ... Start playing the current radio station
        http://raspberripi:3141/stop ... Stop playing the current radio station

### LCD UI

        Key A (upper left)  ... Switch to the previous radio station
        Key B (upper right) ... Switch to the next radio station
        Key C (bottom left) ... Start/Stop playing the current radio station
