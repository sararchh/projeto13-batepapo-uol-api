import express from 'express';
import cors from 'cors';
import { MongoClient } from "mongodb";
import dotenv from 'dotenv';

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


app.post('/participants', (req, res) => {
  try {
    const { name } = req.body;
    const schema = Joi.object({ name: Joi.string().min(3).required() });
    const { error, value } = schema.validate(req.body);

    if (error) {
      return res.status(422).send({ error: "Informe o usuário válido" });
    }

    participants.findOne({
      name
    }).then((user) => {
      if (!user) {
        insertParticipantDatabase();
      } else {
        return res.status(409).send({ error: "Usuário já cadastrado" });
      }
    });

    const insertParticipantDatabase = () => {
      participants.insertOne({
        name,
        lastStatus: Date.now()
      }).then(() => {
        return res.sendStatus(201);
      });
      insertMessagePattern();
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

  } catch (error) {
    return res.sendStatus(422);
  }

});

app.get('/participants', (req, res) => {
  db.collection("participants").find().toArray().then(users => {
    return res.send(users);
  });
});

app.post('/messages', (req, res) => {
  try {
    const { to, text, type } = req.body;
    const { user } = req.headers;

    const SchemaValidateToAndText = Joi.object({
      to: Joi.string().min(3).required(),
      text: Joi.string().min(1).required(),
      type: Joi.string().valid('message', 'private_message')
    });
    const { error, value } = SchemaValidateToAndText.validate(req.body);

    if (error) {
      return res.status(422).send({ error: "Dados inválidos" });
    }

    if (!user) {
      return res.status(422).send({ error: "Informe o usuário" });
    }

    db.collection("participants").findOne({
      name: user
    }).then(user => {
      if (!user) {
        return res.status(422).send({ message: 'Erro no remetente' });
      }

      insertMessageDatabase();
      return res.sendStatus(201);
    });

    const insertMessageDatabase = () => {
      db.collection("message").insertOne({
        from: user,
        to: to,
        text: text,
        type: type,
        time: dayjs().format('hh:mm:ss')
      });
    }

  } catch (error) {
    return res.sendStatus(422);
  }
});

const port = process.env.PORT || 5000;

app.listen(5000, () => {
  console.log('listening on port ' + port + ' 🚀');
});