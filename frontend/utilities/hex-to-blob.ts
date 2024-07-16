export const HexToBlob = (hex: string) => {
  var byteArray = new Uint8Array(hex.length / 2);

  for (var x = 0; x < byteArray.length; x++) {
    byteArray[x] = parseInt(hex.substr(x * 2, 2), 16);
  }

  var blob = new Blob([byteArray], { type: "application/octet-stream" });

  return blob;
};
