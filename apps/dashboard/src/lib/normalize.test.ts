import { describe, it, expect } from 'vitest';
import {
  normalizeUlCode,
  normalizeTombamento,
  normalizeDescription,
  normalizeBarcode,
} from './normalize';

describe('normalizeUlCode', () => {
  it('converte "2927" para "002927" (4 dígitos -> 6 dígitos)', () => {
    expect(normalizeUlCode('2927')).toBe('002927');
  });
  it('mantém "002927" como "002927" (não perde zeros à esquerda)', () => {
    expect(normalizeUlCode('002927')).toBe('002927');
  });
  it('aceita number 2927 (simulando Excel) e converte para string 6 dígitos', () => {
    expect(normalizeUlCode(2927)).toBe('002927');
  });
  it('retorna null para vazio', () => {
    expect(normalizeUlCode('')).toBeNull();
    expect(normalizeUlCode('   ')).toBeNull();
    expect(normalizeUlCode(null)).toBeNull();
  });
  it('extrai apenas dígitos e pad', () => {
    expect(normalizeUlCode('29-27')).toBe('002927');
  });
});

describe('normalizeTombamento', () => {
  it('converte "2927" (só dígitos) para "002927"', () => {
    expect(normalizeTombamento('2927')).toBe('002927');
  });
  it('mantém "002927" como "002927"', () => {
    expect(normalizeTombamento('002927')).toBe('002927');
  });
  it('preserva tombamento alfanumérico sem extrair só dígitos', () => {
    expect(normalizeTombamento('LAPTOP-001')).toBe('LAPTOP-001');
  });
  it('retorna null para vazio', () => {
    expect(normalizeTombamento('')).toBeNull();
    expect(normalizeTombamento('   ')).toBeNull();
  });
});

describe('normalizeDescription', () => {
  it('remove CRLF e LF, substitui por espaço', () => {
    expect(normalizeDescription('Linha 1\r\nLinha 2')).toBe('Linha 1 Linha 2');
    expect(normalizeDescription('Linha 1\nLinha 2')).toBe('Linha 1 Linha 2');
  });
  it('colapsa múltiplos espaços', () => {
    expect(normalizeDescription('a    b   c')).toBe('a b c');
  });
  it('retorna null para vazio', () => {
    expect(normalizeDescription('')).toBeNull();
    expect(normalizeDescription('   ')).toBeNull();
  });
  it('preserva descrição normal', () => {
    expect(normalizeDescription('  Monitor LCD 24"  ')).toBe('Monitor LCD 24"');
  });
});

describe('normalizeBarcode', () => {
  it('trata "-" como null', () => {
    expect(normalizeBarcode('-')).toBeNull();
  });
  it('trata vazio como null', () => {
    expect(normalizeBarcode('')).toBeNull();
    expect(normalizeBarcode('   ')).toBeNull();
  });
  it('preserva barcode válido', () => {
    expect(normalizeBarcode('7891234567890')).toBe('7891234567890');
  });
});
