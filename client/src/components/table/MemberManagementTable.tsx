import React from "react";
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Button } from "@mui/material";
import type { Member } from "@features/member/types";

/**
 * Displays a table of members with personal and account details.
 * Excludes createdAt and updatedAt columns.
 */
interface MemberTableProps {
  members: Member[];
}

export default function MemberTable({ members }: MemberTableProps) {
    return (
        <TableContainer component={Paper}>
        <Table>
            <TableHead>
            <TableRow>
                <TableCell>First Name</TableCell>
                <TableCell>Last Name</TableCell>
                <TableCell>Middle Name</TableCell>
                <TableCell>Contact Number</TableCell>
                <TableCell>Address</TableCell>
                <TableCell>Birth Date</TableCell>
                <TableCell>Loans</TableCell>
                <TableCell>Savings</TableCell>
                <TableCell>Actions</TableCell>
            </TableRow>
            </TableHead>
            <TableBody>
            {members.map((member) => (
                <TableRow key={member.id}>
                <TableCell>{member.firstName}</TableCell>
                <TableCell>{member.lastName}</TableCell>
                <TableCell>{member.middleName}</TableCell>
                <TableCell>{member.contactNumber}</TableCell>
                <TableCell>{member.address}</TableCell>
                <TableCell>
                    {member.birthDate ? new Date(member.birthDate).toLocaleDateString() : ""}
                </TableCell>
                <TableCell>{member.loans.length}</TableCell>
                <TableCell>{member.savings.length}</TableCell>
                <TableCell>
                    <Button size="small" variant="outlined">Edit</Button>
                    <Button size="small" variant="outlined" color="error" sx={{ ml: 1 }}>Delete</Button>
                </TableCell>
                </TableRow>
            ))}
            </TableBody>
        </Table>
        </TableContainer>
    );
}