import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { ObjectId } from "bson";
import { MongoClient } from "mongodb";

import { stripHtml } from "string-strip-html"

import Joi from 'joi';
import dayjs from 'dayjs';

dotenv.config();
const app = express();
app.use(express.json());
app.use(cors());

const mongoClient = new MongoClient(process.env.MONGO_URI);
let db;
let participants;
let message;

mongoClient.connect().then(() => {
  db = mongoClient.db("batepapo-uol");
  participants = db.collection("participants");
  message = db.collection("message");
});


app.post('/participants', async (req, res) => {
  try {
    const { name } = req.body;
    const schema = Joi.object({ name: Joi.string().min(3).required() });
    const { error } = schema.validate(req.body, { abortEarly: false });

    const description = stripHtml(name).result.trim();

    if (error) {
      return res.status(422).send({ error: "Informe o usuário válido" });
    }

    const user = await participants.findOne({ description });

    const insertParticipantDatabase = () => {
      participants.insertOne({
        name: description,
        lastStatus: Date.now()
      });
      insertMessagePattern();
      return res.sendStatus(201);
    }

    const insertMessagePattern = () => {
      message.insertOne({
        from: name,
        to: 'Todos',
        text: 'entra na sala...',
        type: 'status',
        time: dayjs().format('hh:mm:ss')
      });
    }

    if (!user) {
      insertParticipantDatabase();
    } else {
      return res.status(409).send({ error: "Usuário já cadastrado" });
    }

  } catch (error) {
    console.log('error', error);
    return res.sendStatus(422);
  }

});

app.get('/participants', async (req, res) => {
  try {
    const users = await db.collection("participants").find().toArray()
    return res.send(users);
  } catch (error) {
    console.log('error', error);
    return res.sendStatus(422);
  }
});

app.post('/messages', async (req, res) => {
  try {
    const { to, text, type } = req.body;
    const { user } = req.headers;

    const SchemaValidateToAndText = Joi.object({
      to: Joi.string().min(3).required(),
      text: Joi.string().required(),
      type: Joi.string().valid('message', 'private_message')
    });
    const { error } = SchemaValidateToAndText.validate(req.body, { abortEarly: false });

    if (error) {
      return res.status(422).send({ error: "Dados inválidos" });
    }

    if (!user) {
      return res.status(422).send({ error: "Informe o usuário" });
    }

    const users = await db.collection("participants").findOne({ name: user });

    if (!users) {
      return res.status(422).send({ message: 'Erro no remetente' });
    }

    const insertMessageDatabase = () => {
      db.collection("message").insertOne({
        from: stripHtml(user).result.trim(),
        to: stripHtml(to).result.trim(),
        text: stripHtml(text).result.trim(),
        type: stripHtml(type).result.trim(),
        time: dayjs().format('hh:mm:ss')
      });
    }

    insertMessageDatabase();
    return res.sendStatus(201);

  } catch (error) {
    return res.sendStatus(422);
  }
});

app.get('/messages', async (req, res) => {
  try {
    const { user } = req.headers;
    const { limit } = req.query;

    const messageUserToAndFrom = await db.collection("message").find({
      $or: [{ from: user }, { to: user }]
    }).toArray();

    if (!limit) {
      return res.send(messageUserToAndFrom);
    }

    res.send([...messageUserToAndFrom].slice(-limit));

  } catch (error) {
    console.log(error);
    res.sendStatus(422);
  }

});

app.post('/status', async (req, res) => {
  try {
    const { user } = req.headers;

    const users = await db.collection("participants").findOne({ name: user });

    if (!users) {
      return res.sendStatus(404);
    }

    db.collection("participants").updateOne({ name: user }, { $set: { lastStatus: Date.now() } });

  } catch (error) {
    console.log(error);
    res.sendStatus(404);
  }
});

app.delete('/messages/:id', async (req, res) => {
  const { id } = req.params;
  const { user } = req.headers;

  try {
    const messageExists = await message.findOne({ _id: new ObjectId(id) });

    if (!messageExists) {
      return res.sendStatus(404);
    }

    if (messageExists?.from !== user) {
      return res.sendStatus(401);
    }

    await message.deleteOne({ _id: new ObjectId(id) });

    res.status(200).send({ message: "Documento apagado com sucesso!" });

  } catch (error) {
    res.sendStatus(404);
  }
});

setInterval(() => removeParticipants(), 15000);

const removeParticipants = async () => {
  try {
    await db.collection("participants").find().toArray();

    const timestampAtual = new Date().getTime();

    setTimeout(async () => {
      const { value } = await db.collection("participants").findOneAndDelete({ lastStatus: { $lte: timestampAtual } });

      const nameUser = value?.name;

      if (nameUser !== undefined) {
        const resp = await message.insertOne({
          from: nameUser,
          to: 'Todos',
          text: 'sai da sala...',
          type: 'status',
          time: dayjs().format('hh:mm:ss')
        });
      }

    }, 10000);

  } catch (error) {
    console.log('error', error);
  }
};

const port = process.env.PORT || 5000;

app.listen(5000, () => {
  console.log('listening on port ' + port + ' 🚀');
});