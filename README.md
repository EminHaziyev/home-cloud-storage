![logo](https://github.com/EminHaziyev/home-cloud-storage/screenshots/logo.png?raw=true)


# Home Cloud Storage Server

This project is a functional personal cloud storage system. It is built using Node.js, Express, and EJS. It allows users to upload, delete, download files, and send commands to the server via the terminal.

## Main functionalities

-  File and folder controlling (delete, upload, download, create folders and etc.)
-  Basic Auth authentication system
- Locked folders
- Real time system stats
- Real time terminal emulator (Socket.IO + node-pty)
- Easy user and permission controller
- and etc.

> [!NOTE]
> Simple authentication system is not a security problem for me because I am connecting to this server using VPN


## Getting Started
Use these instructions to run your own home cloud server on your server/computer.

### Installation




1. Clone the repo
   ```sh
   git clone https://github.com/EminHaziyev/home-cloud-server
   ```
2. Install NPM packages
   ```sh
   npm install
   ```
3. Open `users.json`, and add a password to user `root`.
   ```json
   {
    "root": {
      "password": "",
      ...
 
    }
  
  
   ```
4. Open localhost:3000/ to enjoy your cloud server.

## Usage

The usage of this server is so easy. You have a simple configuration file named `users.json`. This file contains all users, their names and passwords, and their permissions.
   ```json
  {
    "root": {
      "password": "root",
      "permissions": [...]
    },
    "yourcustomuser": {
      "password": "strongpassword",
      "permissions": [...]
    },
    ...
  }
  
  
  ```

All possible permissions:
 - For uploading files: `upload` 
 - For deleting files or folders : `delete`
 - For creating folders: `mkdir`
 - For downloading something: `download`
 - For storage access: `storage`
 - For viewing all logs: `logs`
 - For terminal access:  `terminal`

> [!WARNING]
> Think twice when you give `terminal` access to someone. Because you can access computer's terminal using this permission.





## Contributing

Thanks for your interest in contributing!

### Getting Started
- Fork the repository
- Create a new branch: `git checkout -b feature-name`
- Make your changes
- Commit and push: `git commit -m 'Add feature'` and `git push origin feature-name`
- Open a Pull Request


### Suggestions
- Bug reports, feature requests, and documentation fixes are welcome

### Next plans
- [ ] Add more secure authentication
- [ ] Add folder upload with subfolder support
- [ ] Add backup


## Contact
 - Email: [ehziyev@gmail.com](mailto:ehziyev@gmail.com)
 - Linkedin: [Emin Hazi](https://emin.works/linkedin)
 - Website: [emin.works](https://emin.works)

## License

[Apache License 2.0](https://github.com/EminHaziyev/home-cloud-server/blob/main/LICENSE)


