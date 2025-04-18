
import express from 'express';
import nodemailer from 'nodemailer';
import cors from 'cors';
import dotenv from 'dotenv';
import { readFile } from 'fs/promises';
import { PDFDocument } from 'pdf-lib';

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

app.post('/enviar-pdf', async (req, res) => {
  const { nombre, pedido, fechaEntrega, notas, correo } = req.body;

  try {
    const pdfBytes = await readFile('./plantilla.pdf');
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const form = pdfDoc.getForm();

    form.getTextField('Pedido').setText(pedido);
    form.getTextField('Fecha de entrega').setText(fechaEntrega);
    form.getTextField('Notas').setText(notas);

    form.flatten(); // Hace que el texto quede fijo en el PDF

    const filledPdfBytes = await pdfDoc.save();

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    await transporter.sendMail({
      from: `"HM Encuadernaciones" <${process.env.EMAIL_USER}>`,
      to: correo,
      subject: 'Actualización de su pedido | HM Encuadernaciones',
      text: `Estimado(a) ${nombre},

Adjunto encontrará la actualización de su pedido.`,
      attachments: [
        {
          filename: 'actualizacion_pedido.pdf',
          content: Buffer.from(filledPdfBytes),
          contentType: 'application/pdf'
        }
      ]
    });

    res.status(200).json({ success: true, message: 'Correo enviado exitosamente.' });

  } catch (error) {
    console.error('Error al enviar el PDF:', error);
    res.status(500).json({ success: false, message: 'Hubo un error al enviar el PDF.' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor backend iniciado en puerto ${PORT}`));
