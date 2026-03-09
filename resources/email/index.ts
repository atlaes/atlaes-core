export const email = new sst.aws.Email('AtlaesEmail', {
  sender: 'atlaes.de',
  dmarc: 'v=DMARC1; p=quarantine;',
});
