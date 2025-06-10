--
-- PostgreSQL database dump
--

-- Dumped from database version 15.13 (Debian 15.13-0+deb12u1)
-- Dumped by pg_dump version 15.13 (Debian 15.13-0+deb12u1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: countries; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.countries (id, name, slug) VALUES (1, 'Japan', 'japan');
INSERT INTO public.countries (id, name, slug) VALUES (2, 'south-korea', 'korea');
INSERT INTO public.countries (id, name, slug) VALUES (3, 'Thailand', 'thailand');
INSERT INTO public.countries (id, name, slug) VALUES (4, 'Vietnam', 'vietnam');
INSERT INTO public.countries (id, name, slug) VALUES (5, 'Singapore', 'singapore');
INSERT INTO public.countries (id, name, slug) VALUES (6, 'China', 'china');
INSERT INTO public.countries (id, name, slug) VALUES (7, 'Malaysia', 'malaysia');
INSERT INTO public.countries (id, name, slug) VALUES (8, 'France', 'france');
INSERT INTO public.countries (id, name, slug) VALUES (9, 'Britain', 'britain');


--
-- Name: countries_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.countries_id_seq', 9, true);


--
-- PostgreSQL database dump complete
--

