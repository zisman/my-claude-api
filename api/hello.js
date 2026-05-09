export default function handler(req, res) {
  res.status(200).json({
    message: 'Paragliding Club API is running!',
    status: 'ok'
  });
}