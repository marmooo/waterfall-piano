# sudo apt install mkcert
# mkcert -install
# mkdir ~/.ssl && cd ~/.ssl
# mkcert localhost
# sudo npm install http-server -g
http-server --ssl --cert ~/.ssl/localhost.pem --key ~/.ssl/localhost-key.pem
