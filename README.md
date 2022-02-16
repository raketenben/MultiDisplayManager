# MultiDisplayManager

MultiDisplayManager is a cross-plattform slideshow Software for controlling a multitude of displays in a network.

## Usage
To use this software simply, install it on all your clients, as well as on the device you want to control your clients from.

On your clients, you want to open the program with the `--viewer` flag. 
On your host, you can just open it like you would any other program.

Next you will need to pair your clients to your host device.


The clients should appear entirely black on first setup, until you press the `Esc` Key on their keyboard.

This should bring up the pairing dialog, here you can set a name as well as a password to protect the client from being paired to another device.

To pair a client, you need to click **Clients** on the Host and click the **Pair** button next to the client you want to pair.
Now you just need to enter the pairing key as shown on the client. 
(You can pair each client to as many hosts as you want)

## Multiple Monitors

This software can also be used for multiple monitors connected to a single client.
To do this, you will need to provide a unique savename for each instance (`--savename=something`), but just giving them a number should suffice.

Each Instance of the Sowftware on a client will need to be paired individually.

## Autostart ##
This Software does **not** include any autostart capabilities, you will need to start the software yourself.

For setups with multiple monitors, you will also need to make sure the program opens on the correct monitor.

Provided is an example startup script for Raspberry Pi in combination with x-server, that should work for any arbitrary number of monitors connected.

You may also want to disable auto updates for clients, since without the program being closed correctly, updates may not install correctly and corrupt the installation.

## Arguments

| Attributes             | Description                                                                                   |
| :--------------------- | :-------------------------------------------------------------------------------------------- |
| `--viewer`             | Puts the programm in viewer mode                                                              |
| `--pairing           ` | Enables pairing mode directly                                                                 |
| `--savename=<name>`    | Specifies the savefolder name **(in case you have more than one monitor on a single client)** |
| `--disableAutoUpdate ` | Disables the included updating capabilities **(in case you require to update manually)**      |
| `--restartAfterUpdate` | Restart immedeatly after update installed **(will always restart into host mode)**            |
| `--reset-identifier  ` | Generates a new instance identifier **(requires repair)**                                     |
| `--reset-keys        ` | Generates new encryption keys for communication **(requires repair)**                         |


This software was developed on behalf of the [University of Siegen](https://www.uni-siegen.de/)